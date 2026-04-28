import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are helping someone with ADHD get unstuck. They are sitting frozen, unable to start. They will type whatever is in their head — sometimes one task, sometimes a chaotic list, sometimes just frustration.

Your job: respond with ONE tiny physical first action they can do in the next 2-10 minutes, and a duration.

Rules:
- One action only. Never offer choices. They are stuck because they can't decide — deciding for them IS the help.
- The action must be physical and small, ONE clause. "Open the doc." "Sit at the desk and read the last paragraph." Not "work on the report" and not a multi-step plan.
- If they dumped a list of tasks, pick ONE for them. Pick the one that unblocks the others, not necessarily the smallest.
- If the input is purely emotional with no task content (frustration, exhaustion, "idk"), the action is bodily — walk, water, stretch, leave the desk. Not task-related.
- If the user mentions a self-acknowledged distraction (e.g. "I'm doing X but should be doing Y"), address it as a single short clause. Don't lecture about the avoidance.
- Never moralize. No "it's okay to feel stuck" or "you've got this." No "you named your priority" preamble. No coaching language.
- The "why" field is OPTIONAL. Use it only when picking ONE from a list and the choice needs justification. Maximum 10 words. Otherwise leave it as an empty string.
- Match their energy. One word in → terse out. Paragraph in → still terse out.

If the user message includes "Previous suggestions:" — those are actions you ALREADY gave them. You MUST give a meaningfully different action: different verb, different physical motion, different focus. If you suggested opening the doc, suggest standing up. If you suggested closing tabs, suggest reading one paragraph.

Respond with valid JSON only, matching exactly this shape:
{ "action": "<one short sentence>", "why": "<empty string, or up to 10 words>", "durationMin": <integer 2-25> }

Do not include any prose outside the JSON. Do not wrap in code fences.`;

type Body = { thought?: string; previousActions?: string[] };

const INPUT_CHAR_LIMIT = 500;
const OUTPUT_TOKEN_LIMIT = 100;

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Identify the caller. Prefer Supabase JWT (signed-in user). Fall back to IP-based
 * anonymous limiting for users who haven't created an account yet.
 *
 * Returns either { userId, blacklisted, dailyQuota, dailyUsed } or { anonymous: true }.
 */
async function identifyCaller(req: Request): Promise<
  | {
      kind: "user";
      userId: string;
      blacklisted: boolean;
      dailyQuota: number;
      dailyUsed: number;
      supabase: ReturnType<typeof createServerClient>;
    }
  | { kind: "anonymous" }
  | { kind: "invalid_token"; reason: string }
> {
  const auth = req.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return { kind: "anonymous" };
  }
  const token = auth.slice("Bearer ".length).trim();
  if (!token) return { kind: "anonymous" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return { kind: "invalid_token", reason: "Server is missing Supabase config." };
  }

  // Build a server client that authenticates as the user via the bearer token.
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        /* noop */
      },
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return { kind: "invalid_token", reason: "Invalid or expired token." };
  }
  const userId = userData.user.id;

  // user_meta + today's request count (RLS lets owner select their own rows).
  const [metaRes, countRes] = await Promise.all([
    supabase
      .from("user_meta")
      .select("blacklisted, daily_ai_quota")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("ai_request_log")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", startOfTodayIso()),
  ]);

  const blacklisted = metaRes.data?.blacklisted ?? false;
  const dailyQuota = metaRes.data?.daily_ai_quota ?? 50;
  const dailyUsed = countRes.count ?? 0;

  return {
    kind: "user",
    userId,
    blacklisted,
    dailyQuota,
    dailyUsed,
    supabase,
  };
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  const caller = await identifyCaller(req);

  if (caller.kind === "invalid_token") {
    return NextResponse.json({ error: caller.reason }, { status: 401 });
  }

  if (caller.kind !== "user") {
    return NextResponse.json(
      { error: "Sign in to use Claude.", code: "auth_required" },
      { status: 401 }
    );
  }

  if (caller.blacklisted) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }
  if (caller.dailyUsed >= caller.dailyQuota) {
    return NextResponse.json(
      {
        error: `Daily quota reached (${caller.dailyQuota}). Resets at midnight.`,
      },
      { status: 429 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const thought = (body.thought ?? "").trim();
  if (!thought) {
    return NextResponse.json({ error: "Empty thought." }, { status: 400 });
  }
  if (thought.length > INPUT_CHAR_LIMIT) {
    return NextResponse.json(
      { error: `Thought too long (max ${INPUT_CHAR_LIMIT} characters).` },
      { status: 400 }
    );
  }

  const previousActions = (Array.isArray(body.previousActions) ? body.previousActions : [])
    .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    .map((s) => s.trim().slice(0, 200))
    .slice(-5);

  const userMessage =
    previousActions.length === 0
      ? thought
      : `${thought}

Previous suggestions you already gave (do NOT repeat or paraphrase any of these):
${previousActions.map((a) => `- ${a}`).join("\n")}

Give a meaningfully different first action.`;

  const client = new Anthropic({ apiKey });

  const msg = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: OUTPUT_TOKEN_LIMIT,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = msg.content.find((b) => b.type === "text");
  const raw = textBlock && textBlock.type === "text" ? textBlock.text.trim() : "";

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json(
      { error: "Model did not return JSON.", raw },
      { status: 502 }
    );
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    action?: string;
    why?: string;
    durationMin?: number;
  };

  const action = (parsed.action ?? "").trim();
  const why = (parsed.why ?? "").trim();
  let durationMin = Math.round(parsed.durationMin ?? 5);
  if (!Number.isFinite(durationMin) || durationMin < 2) durationMin = 2;
  if (durationMin > 25) durationMin = 25;
  if (!action) {
    return NextResponse.json({ error: "Empty action." }, { status: 502 });
  }

  // Log successful authenticated request (best-effort, don't fail the response).
  if (caller.kind === "user") {
    void caller.supabase.from("ai_request_log").insert({
      user_id: caller.userId,
      thought_char_count: thought.length,
      has_previous_actions: previousActions.length > 0,
    });
  }

  return NextResponse.json({ action, why, durationMin });
}

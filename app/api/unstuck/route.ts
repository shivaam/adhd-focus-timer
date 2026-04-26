import Anthropic from "@anthropic-ai/sdk";
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

// Simple in-memory per-IP rate limit. Resets on serverless cold start.
// For deploy: replace with Upstash or similar.
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const rateBuckets = new Map<string, number[]>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function rateCheck(ip: string): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const recent = (rateBuckets.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    const oldestInWindow = recent[0];
    return { ok: false, retryAfterSec: Math.ceil((RATE_WINDOW_MS - (now - oldestInWindow)) / 1000) };
  }
  recent.push(now);
  rateBuckets.set(ip, recent);
  return { ok: true, retryAfterSec: 0 };
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing ANTHROPIC_API_KEY." },
      { status: 500 }
    );
  }

  const ip = clientIp(req);
  const rate = rateCheck(ip);
  if (!rate.ok) {
    return NextResponse.json(
      { error: `Too many requests. Try again in ${Math.ceil(rate.retryAfterSec / 60)} min.` },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } }
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

  return NextResponse.json({ action, why, durationMin });
}

import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico
     * - audio/* (static media)
     * - any path with a file extension (e.g., images)
     */
    "/((?!_next/static|_next/image|favicon.ico|audio/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3|wav|ico)$).*)",
  ],
};

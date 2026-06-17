import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase auth session on every request and writes any rotated
// auth cookies back to the browser. Without this, server components read a
// stale/expired access token and users get silently logged out. This is the
// pattern Supabase requires for the Next.js App Router. (Next.js 16 renamed the
// "middleware" convention to "proxy".)
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Touch the user to trigger a token refresh if needed. Do not run other code
  // between createServerClient and getUser, or sessions can desync.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Run on all routes except static assets and the Stripe webhook (which must
  // receive the raw, unmodified request body for signature verification).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/stripe/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

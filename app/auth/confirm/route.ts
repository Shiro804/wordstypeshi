import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);

  const next = searchParams.get("next") ?? "/";

  // Newer Supabase email confirmation links use PKCE and provide a `code`.
  // We must exchange it for a session so cookies are set.
  const code = searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  // Older OTP-style links may provide `token_hash` + `type`.
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const supabase = await createClient();

    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      redirect(next);
    }

    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  // If we landed here without any known parameters, show a helpful error.
  redirect(
    `/auth/error?error=${encodeURIComponent(
      `Invalid confirmation link. Expected ?code=... or ?token_hash=...&type=... (origin: ${origin})`,
    )}`,
  );
}

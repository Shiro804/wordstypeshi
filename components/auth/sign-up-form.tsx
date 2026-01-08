"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock, Loader2 } from "lucide-react";
import { getPublicSiteUrl } from "@/lib/site-url";
import { useLanguage } from "@/lib/i18n";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError(t.auth.passwordsDontMatch);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${getPublicSiteUrl()}/auth/confirm?next=/`,
        },
      });

      if (error) {
        const status = typeof error === "object" && error && "status" in error ? (error as { status?: number }).status : undefined;
        throw new Error(status ? `${status}: ${error.message}` : error.message);
      }

      if (!data.session) {
        router.push("/auth/sign-up-success");
        return;
      }

      const authUserId = data.user?.id;
      if (authUserId) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ id: authUserId }, { onConflict: "id" });
        if (profileError) throw profileError;
      }

      router.push("/");
    } catch (error: unknown) {
      console.error("Sign up failed:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError(t.common.error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      {/* Glassmorphism Card */}
      <div className="relative rounded-2xl border border-emerald-500/20 bg-zinc-900/80 backdrop-blur-xl shadow-2xl shadow-emerald-500/5 overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-white mb-2">{t.auth.createAccount}</h2>
            <p className="text-sm text-zinc-400">{t.auth.signupSubtitle}</p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Email Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-zinc-500" />
              </div>
              <Input
                id="email"
                type="email"
                placeholder={t.auth.email}
                autoCapitalize="none"
                autoCorrect="off"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-12 h-12 bg-zinc-800/50 border-zinc-700/50 rounded-xl text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-zinc-500" />
              </div>
              <Input
                id="password"
                type="password"
                placeholder={t.auth.password}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-12 h-12 bg-zinc-800/50 border-zinc-700/50 rounded-xl text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Repeat Password Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-zinc-500" />
              </div>
              <Input
                id="repeat-password"
                type="password"
                placeholder={t.auth.repeatPassword}
                required
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                className="pl-12 h-12 bg-zinc-800/50 border-zinc-700/50 rounded-xl text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:ring-emerald-500/20 transition-all"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t.auth.creatingAccount}</span>
                </>
              ) : (
                <span>{t.common.register}</span>
              )}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 pt-6 border-t border-zinc-800 space-y-3">
            <p className="text-center text-sm text-zinc-400">
              {t.auth.hasAccount}{" "}
              <Link
                href="/auth/login"
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                {t.common.login}
              </Link>
            </p>
            <p className="text-center">
              <Link
                href="/"
                className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                {t.hub.continueAsGuest}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

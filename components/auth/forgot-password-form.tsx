"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";
import { Mail, Loader2, CheckCircle } from "lucide-react";
import { getPublicSiteUrl } from "@/lib/site-url";
import { useLanguage } from "@/lib/i18n";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getPublicSiteUrl()}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : t.common.error);
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
          {success ? (
            <>
              {/* Success State */}
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t.auth.emailSent}</h2>
                <p className="text-sm text-zinc-400 mb-6">
                  {t.auth.emailSentDesc}
                </p>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center justify-center w-full h-12 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-lg shadow-emerald-500/25 transition-all duration-300"
                >
                  {t.auth.backToLogin}
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Form State */}
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">{t.auth.forgotTitle}</h2>
                <p className="text-sm text-zinc-400">{t.auth.forgotSubtitle}</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                {/* Email Field */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-zinc-500" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t.auth.email}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                      <span>{t.auth.sending}</span>
                    </>
                  ) : (
                    <span>{t.auth.sendResetLink}</span>
                  )}
                </button>
              </form>

              {/* Footer Links */}
              <div className="mt-6 pt-6 border-t border-zinc-800 space-y-3">
                <p className="text-center text-sm text-zinc-400">
                  {t.auth.rememberPassword}{" "}
                  <Link
                    href="/auth/login"
                    className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                  >
                    {t.common.login}
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

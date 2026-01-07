import { LoginForm } from "@/components/auth/login-form";
import DuckBackground from "@/components/shared/DuckBackground";

export default function Page() {
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden p-6 md:p-10">
      {/* BataGames animated background */}
      <div className="absolute inset-0 -z-10">
        <DuckBackground title="BataGames" />
        {/* Dim overlay for readability */}
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}

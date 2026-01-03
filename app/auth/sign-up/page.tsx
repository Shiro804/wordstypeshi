import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden p-6 md:p-10">
      {/* Background image placeholder:
          Put your image into `public/auth-bg.jpg` to replace it. */}
      <div className="absolute inset-0 -z-10">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundColor: "#09090b",
            backgroundImage:
              "radial-gradient(1200px 700px at 20% 10%, rgba(255,255,255,0.10), transparent 55%), radial-gradient(900px 600px at 80% 20%, rgba(16,185,129,0.12), transparent 60%), url(/auth-bg.jpg)",
          }}
        />
        <div className="absolute inset-0 bg-black/55" />
      </div>

      <div className="w-full max-w-sm">
        <SignUpForm />
      </div>
    </div>
  );
}

import { currentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { env } from "@/lib/env";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(user.role === "CEO" ? "/dashboard" : "/my-tasks");

  return (
    <main className="login-shell">
      <section className="login-intro" aria-label="Product introduction">
        <div className="login-brand">
          <img src="/assets/divineesoft-mark.png" alt="DivineeSoft" className="login-logo" />
          <span>{env.companyName}</span>
        </div>
        <div className="login-intro-copy">
          <p className="eyebrow login-eyebrow">Executive operating system</p>
          <h1>Make the next decision with the whole company in view.</h1>
          <p>
            One focused place for priorities, people, projects, and the work that needs your attention today.
          </p>
        </div>
        <div className="login-signals" aria-label="Product capabilities">
          <div><strong>01</strong><span>See what is moving</span></div>
          <div><strong>02</strong><span>Clear what is blocked</span></div>
          <div><strong>03</strong><span>Choose what happens next</span></div>
        </div>
        <p className="login-footnote">Private workspace for the DivineeSoft team</p>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <div className="login-theme"><ThemeToggle /></div>
          <div className="login-mobile-brand">
            <img src="/assets/divineesoft-mark.png" alt="DivineeSoft" className="login-logo login-logo-dark" />
            <span>{env.companyName}</span>
          </div>
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to your workspace</h2>
          <p className="login-subtitle">Continue to your priorities and team operating view.</p>
          <LoginForm />
          <p className="login-security">Your session is private and protected with secure authentication.</p>
        </div>
      </section>
    </main>
  );
}

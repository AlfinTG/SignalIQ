import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, BarChart3, CheckCircle2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authConfigured, supabase } from "../auth";
import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const isSignUp = pathname === "/sign-up";
  const isRecoveryRequest = pathname === "/recover";
  const isPasswordReset = pathname === "/reset-password";
  const mode = isSignUp ? "Create account" : isRecoveryRequest ? "Recover access" : isPasswordReset ? "Set a new password" : "Sign in";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (session && !isPasswordReset) navigate("/", { replace: true }); }, [isPasswordReset, navigate, session]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (isPasswordReset && password !== passwordConfirmation) { setMessage("The passwords do not match."); return; }
    setBusy(true); setMessage(null);
    const resetRedirectTo = `${window.location.origin}/reset-password`;
    const result = isSignUp
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/sign-in` } })
      : isRecoveryRequest
        ? await supabase.auth.resetPasswordForEmail(email, { redirectTo: resetRedirectTo })
        : isPasswordReset
          ? await supabase.auth.updateUser({ password })
          : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) { setMessage(result.error.message); return; }
    if (isPasswordReset) { setMessage("Password updated. Redirecting…"); navigate("/", { replace: true }); return; }
    setMessage(isRecoveryRequest ? "If that address exists, a recovery email has been requested." : isSignUp ? "Check your inbox to confirm your account, then sign in." : "Signed in. Redirecting…");
  }

  return <main className="min-h-screen bg-canvas p-4 sm:p-6 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:p-0">
    <section className="relative hidden overflow-hidden bg-brand-600 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14"><div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-citrus/15" /><div className="relative"><div className="flex items-center gap-3 text-xl font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-citrus text-brand-700"><BarChart3 className="h-5 w-5" /></span>SignalIQ</div><p className="mt-20 max-w-md text-4xl font-semibold leading-tight tracking-[-0.045em]">Turn the voice of your customers into your next clear decision.</p><p className="mt-5 max-w-sm text-base leading-7 text-white/70">A private workspace for feedback, evidence, and the patterns worth acting on.</p></div><ul className="relative space-y-3 text-sm text-white/85"><li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-citrus" />Workspace-scoped feedback</li><li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-citrus" />Evidence before assumptions</li></ul></section>
    <section className="mx-auto flex w-full max-w-md items-center py-8 lg:max-w-none lg:px-12 xl:px-20"><div className="w-full"><Link to="/welcome" className="inline-flex items-center gap-2 text-sm font-bold text-brand-700 hover:text-brand-600"><span className="grid h-8 w-8 place-items-center rounded-xl bg-citrus"><BarChart3 className="h-4 w-4" /></span><span className="lg:hidden">SignalIQ</span></Link><p className="page-kicker mt-10">Secure workspace access</p><h1 className="page-title">{mode}</h1><p className="page-copy">{isSignUp ? "Start organizing customer feedback with a private SignalIQ workspace." : "Find the signal. Fix the problem."}</p>
      {!authConfigured ? <div className="panel-muted mt-7 p-4 text-sm leading-6 text-ink-muted">Authentication is not configured in this environment. Add the public Supabase URL and publishable key before collecting credentials.</div> : <form onSubmit={submit} className="mt-7 space-y-4">{!isPasswordReset ? <label className="field-label">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" autoComplete="email" /></label> : null}{!isRecoveryRequest ? <label className="field-label">{isPasswordReset ? "New password" : "Password"}<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="field" autoComplete={isPasswordReset ? "new-password" : "current-password"} /></label> : null}{isPasswordReset ? <label className="field-label">Confirm new password<input required minLength={6} type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="field" autoComplete="new-password" /></label> : null}<button disabled={busy} className="primary-button mt-2 w-full">{busy ? "Please wait…" : <>{isSignUp ? "Create your workspace" : mode}<ArrowRight className="ml-2 h-4 w-4" /></>}</button>{message ? <p role="status" className="rounded-xl bg-stone px-3 py-2.5 text-sm leading-6 text-ink-muted">{message}</p> : null}</form>}
      <p className="mt-6 text-sm text-ink-muted">{pathname === "/sign-in" ? <><Link to="/sign-up" className="font-bold text-brand-700 hover:text-brand-600">Create an account</Link><span className="mx-2">·</span><Link to="/recover" className="font-bold text-brand-700 hover:text-brand-600">Recover access</Link></> : <Link to="/sign-in" className="font-bold text-brand-700 hover:text-brand-600">Return to sign in</Link>}</p></div></section>
  </main>;
}

import { useEffect, useState, type FormEvent } from "react";
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
    if (isPasswordReset && password !== passwordConfirmation) {
      setMessage("The passwords do not match.");
      return;
    }
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
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (isPasswordReset) {
      setMessage("Password updated. Redirecting…");
      navigate("/", { replace: true });
      return;
    }
    setMessage(isRecoveryRequest ? "If that address exists, a recovery email has been requested." : isSignUp ? "Check your inbox to confirm your account, then sign in." : "Signed in. Redirecting…");
  }
  return <main className="grid min-h-screen place-items-center bg-canvas p-5"><section className="w-full max-w-md border border-line bg-surface p-7 shadow-card"><Link to="/welcome" className="text-sm font-semibold text-brand-700 hover:text-brand-600">SignalIQ</Link><h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">{mode}</h1><p className="mt-2 text-sm leading-6 text-ink-muted">Find the signal. Fix the problem.</p>{!authConfigured ? <div className="mt-7 rounded-lg bg-[#EDEAE1] p-4 text-sm text-ink-muted">Authentication is not configured in this environment. Add the public Supabase URL and publishable key before collecting credentials.</div> : <form onSubmit={submit} className="mt-7 space-y-4">{!isPasswordReset ? <label className="block text-sm font-medium text-ink">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink" /></label> : null}{!isRecoveryRequest ? <label className="block text-sm font-medium text-ink">{isPasswordReset ? "New password" : "Password"}<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink" /></label> : null}{isPasswordReset ? <label className="block text-sm font-medium text-ink">Confirm new password<input required minLength={6} type="password" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink" /></label> : null}<button disabled={busy} className="w-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "Please wait…" : mode}</button>{message ? <p role="status" className="text-sm text-ink-muted">{message}</p> : null}</form>}<p className="mt-6 text-sm text-ink-muted">{pathname === "/sign-in" ? <><Link to="/sign-up" className="font-semibold text-brand-700">Create an account</Link> · <Link to="/recover" className="font-semibold text-brand-700">Recover access</Link></> : <Link to="/sign-in" className="font-semibold text-brand-700">Return to sign in</Link>}</p></section></main>;
}

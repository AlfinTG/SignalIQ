import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authConfigured, supabase } from "../auth";
import { useAuth } from "../context/AuthContext";

export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const mode = pathname === "/sign-up" ? "Create account" : pathname === "/recover" ? "Recover access" : "Sign in";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (session) navigate("/", { replace: true }); }, [navigate, session]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true); setMessage(null);
    const redirectTo = `${window.location.origin}/sign-in`;
    const result = pathname === "/sign-up"
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } })
      : pathname === "/recover"
        ? await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    setMessage(result.error ? result.error.message : pathname === "/recover" ? "If that address exists, a recovery email has been requested." : pathname === "/sign-up" ? "Check your inbox to confirm your account, then sign in." : "Signed in. Redirecting…");
  }
  return <main className="grid min-h-screen place-items-center bg-canvas p-5"><section className="w-full max-w-md border border-line bg-surface p-7 shadow-card"><Link to="/welcome" className="text-sm font-semibold text-brand-700 hover:text-brand-600">SignalIQ</Link><h1 className="mt-6 text-3xl font-semibold tracking-tight text-ink">{mode}</h1><p className="mt-2 text-sm leading-6 text-ink-muted">Find the signal. Fix the problem.</p>{!authConfigured ? <div className="mt-7 rounded-lg bg-[#EDEAE1] p-4 text-sm text-ink-muted">Authentication is not configured in this environment. Add the public Supabase URL and publishable key before collecting credentials.</div> : <form onSubmit={submit} className="mt-7 space-y-4"><label className="block text-sm font-medium text-ink">Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink" /></label>{pathname !== "/recover" ? <label className="block text-sm font-medium text-ink">Password<input required minLength={6} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full border border-line bg-white px-3 py-2 text-ink" /></label> : null}<button disabled={busy} className="w-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{busy ? "Please wait…" : mode}</button>{message ? <p role="status" className="text-sm text-ink-muted">{message}</p> : null}</form>}<p className="mt-6 text-sm text-ink-muted">{pathname === "/sign-in" ? <><Link to="/sign-up" className="font-semibold text-brand-700">Create an account</Link> · <Link to="/recover" className="font-semibold text-brand-700">Recover access</Link></> : <Link to="/sign-in" className="font-semibold text-brand-700">Return to sign in</Link>}</p></section></main>;
}

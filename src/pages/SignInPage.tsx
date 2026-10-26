import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { PageHeading } from "../components/SiteLayout";
import { ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { PasswordInput } from "../components/PasswordInput";
import { getPostSignInDestination } from "../lib/roleNavigation";

export function SignInPage({ register = false }: { register?: boolean }) {
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const requestedDestination = (location.state as { from?: string } | null)?.from;

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const signedInUser = register ? await signUp(email, name, password) : await signIn(email, password);
      navigate(getPostSignInDestination(signedInUser.roles, requestedDestination), { replace: true });
    } catch (failure) {
      setError(failure instanceof ApiError ? failure.message : "Sign-in failed. Check that the backend is running and try again.");
    } finally { setBusy(false); }
  };

  if (authLoading) return <div className="page-shell"><p role="status">Checking your account…</p></div>;
  if (user) return <Navigate to={getPostSignInDestination(user.roles)} replace />;

  return <div className="page-shell"><div className="content-narrow auth-page">
    <PageHeading eyebrow={register ? "Citizen account" : "Welcome back"} title={register ? "Create your citizen account." : "Sign in to continue."} description={register ? "Your account lets you save and review your reports." : "Sign in to submit reports and view your incident history."} />
    {error && <div className="inline-error" role="alert">{error}</div>}
    <form className="auth-form" onSubmit={submit}>
      {register && <label className="field-label">Display name<input required minLength={2} maxLength={80} className="text-input" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" /></label>}
      <label className="field-label">Email address<input required type="email" maxLength={254} className="text-input" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>
      <div className="field-label"><label htmlFor="account-password">Password</label><PasswordInput id="account-password" required minLength={register ? 12 : 1} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={register ? "new-password" : "current-password"} />{register && <small>At least 12 characters, with upper/lowercase letters, a number, and a symbol.</small>}</div>
      <button className="button button-primary button-submit" type="submit" disabled={busy}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
    </form>
    <p className="auth-switch">{register ? "Already have an account? " : "New to Emergency112? "}<Link to={register ? "/sign-in" : "/register"}>{register ? "Sign in" : "Create an account"}</Link></p>
  </div></div>;
}

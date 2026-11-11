import { FormEvent, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, ApiError } from "../auth/AuthContext";

const DEMO_EMAIL = "demo@platform-ops.local";
const DEMO_PASSWORD = "demo-ops-console-2026";

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-box">
      <h1>Platform Ops Console</h1>
      <p>Portfolio demo — webhook delivery operations (Habib Noor)</p>
      <form onSubmit={(e) => void onSubmit(e)} aria-label="Login">
        <div className="filters" style={{ flexDirection: "column" }}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
        </div>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        <button type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="hint">
        Demo credentials (non-secret): email <code>{DEMO_EMAIL}</code>, password{" "}
        <code>{DEMO_PASSWORD}</code>
      </p>
    </div>
  );
}

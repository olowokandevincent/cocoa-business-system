import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Lock, Eye, EyeOff, Loader2, Users, Banknote, Sprout, ShieldCheck, Sparkles } from "lucide-react";
import { CocoaMark } from "@/components/CocoaMark";
import { ESTATE } from "@/styles/imagery";

export default function Login() {
  const { login, error } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demo, setDemo] = useState(null);

  // The demo account only exists when the operator has set one up.
  useEffect(() => {
    api.get("/auth/demo").then((r) => setDemo(r.data)).catch(() => setDemo(null));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email.trim().toLowerCase(), password.trim());
    setLoading(false);
    if (ok) navigate("/");
  };

  const enterDemo = async () => {
    setEmail(demo.email);
    setPassword(demo.password);
    setLoading(true);
    const ok = await login(demo.email, demo.password);
    setLoading(false);
    if (ok) navigate("/");
  };

  return (
    <div className="ce-auth" data-testid="login-container">
      {/* The estate, in full */}
      <div className="ce-auth-art">
        <img src={ESTATE} alt="Cocoa plantation" />
        <div className="ce-auth-scrim" aria-hidden="true" />

        <div className="ce-auth-brand">
          <CocoaMark />
          <span className="ce-word">
            <b>Cocoa Ledger</b>
            <span>Private Business Records</span>
          </span>
        </div>

        <div className="ce-auth-pitch">
          <div className="ce-eyebrow">Buying, weighing, settling — all season</div>
          <h1>
            Every pod, every naira,<br />
            <em>on the record</em>.
          </h1>
          <div className="ce-rule" />
          <p>
            The notebook your grandfather kept, without the missing pages. Customers,
            debts, fertilizer and cocoa in store — recorded once, findable forever.
          </p>
          <div className="ce-feats">
            <span className="ce-feat"><Users /> Customer ledgers</span>
            <span className="ce-feat"><Banknote /> Debts &amp; repayments</span>
            <span className="ce-feat"><Sprout /> Fertilizer tracking</span>
            <span className="ce-feat"><ShieldCheck /> Owner &amp; staff access</span>
          </div>
        </div>
      </div>

      {/* The way in */}
      <div className="ce-auth-panel">
        <div className="ce-auth-card">
          <div className="ce-eyebrow dark">Cocoa Ledger</div>
          <h2>Welcome back</h2>
          <p className="ce-lead">Sign in to open your business records.</p>

          <form onSubmit={submit}>
            <div className="ce-field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                data-testid="login-email-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                placeholder="you@example.com"
              />
            </div>

            <div className="ce-field">
              <label htmlFor="password">Password</label>
              <div className="ce-pass">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  data-testid="login-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  data-testid="toggle-password-visibility"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {error && (
              <div data-testid="login-error" className="ce-error">{error}</div>
            )}

            <button
              type="submit"
              data-testid="login-submit-button"
              disabled={loading}
              className="ce-cta"
              style={{ width: "100%", marginTop: 22 }}
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Sign in</>}
            </button>
          </form>

          {demo?.available && (
            <div className="ce-demo">
              <Sparkles />
              <div style={{ flex: 1 }}>
                <b>Just looking around?</b>
                <span>Open the ledger with a ready-made demo account.</span>
              </div>
              <button
                type="button"
                onClick={enterDemo}
                disabled={loading}
                data-testid="login-demo-button"
                className="ce-cta pale sm"
              >
                Enter demo
              </button>
            </div>
          )}

          <div className="ce-auth-foot">
            <div className="ce-eyebrow dark" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Lock style={{ width: 15, height: 15 }} /> Private system
            </div>
            <p>Only the owner and trusted staff can log in. Sessions are locked to this device and end when you log out.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

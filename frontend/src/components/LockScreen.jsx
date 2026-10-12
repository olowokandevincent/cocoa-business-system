import { useState } from "react";
import { api, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Delete, LogOut } from "lucide-react";
import { CocoaMark } from "@/components/CocoaMark";
import { ESTATE } from "@/styles/imagery";

export function LockScreen({ onUnlock }) {
  const { user, logout } = useAuth();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const press = (d) => {
    if (busy) return;
    setError("");
    setPin((p) => (p.length < 6 ? p + d : p));
  };
  const back = () => setPin((p) => p.slice(0, -1));

  const submit = async () => {
    if (pin.length < 4) { setError("Enter your 4–6 digit PIN"); return; }
    setBusy(true); setError("");
    try {
      await api.post("/auth/pin/verify", { pin });
      setPin("");
      onUnlock();
    } catch (e) {
      setError(apiErr(e));
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ce-lockscreen" data-testid="lock-screen">
      <img src={ESTATE} alt="" aria-hidden="true" />
      <div className="ce-lockscreen-scrim" aria-hidden="true" />
      <div className="ce-lockscreen-in">
        <CocoaMark className="ce-logo" />
        <h1>Screen locked</h1>
        <p>Enter {user?.name?.split(" ")[0] || "your"} PIN to continue</p>

        <div className="flex gap-3 my-6" data-testid="pin-dots">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`ce-pindot ${i < pin.length ? "on" : ""}`} />
          ))}
        </div>

        {error && <div data-testid="pin-error" className="ce-error" style={{ marginBottom: 16 }}>{error}</div>}

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => press(String(n))} data-testid={`pin-key-${n}`} className="ce-lockpin">
              {n}
            </button>
          ))}
          <button onClick={back} data-testid="pin-key-back" className="ce-lockpin ghost" aria-label="Delete">
            <Delete style={{ width: 28, height: 28 }} />
          </button>
          <button onClick={() => press("0")} data-testid="pin-key-0" className="ce-lockpin">
            0
          </button>
          <button onClick={submit} disabled={busy} data-testid="pin-unlock-button" className="ce-lockpin ok">
            {busy ? "…" : "OK"}
          </button>
        </div>

        <button onClick={() => logout()} data-testid="lock-logout" className="ce-lockout">
          <LogOut style={{ width: 20, height: 20 }} /> Log out instead
        </button>
      </div>
    </div>
  );
}

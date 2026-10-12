import { useState } from "react";
import { api, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLock } from "@/context/LockContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Lock, KeyRound } from "lucide-react";
import { toast } from "sonner";

export function PinControls({ variant = "desktop" }) {
  const { user, setUser } = useAuth();
  const { lock } = useLock();
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const doLock = () => {
    if (!user?.pin_set) {
      toast.info("Set a PIN first to use screen lock");
      setOpen(true);
      return;
    }
    lock();
  };

  const savePin = async (e) => {
    e.preventDefault();
    if (pin !== confirm) { toast.error("PINs do not match"); return; }
    setBusy(true);
    try {
      await api.put("/auth/pin", { pin, password });
      setUser({ ...user, pin_set: true });
      toast.success("PIN saved");
      setOpen(false); setPin(""); setConfirm(""); setPassword("");
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setBusy(false);
    }
  };

  // The mobile variant is rendered inside the .ce-menu panel, which styles its
  // own buttons, so it needs no class of its own.
  const btnClass = variant === "mobile" ? undefined : "flex ce-btn";

  return (
    <>
      <button onClick={doLock} data-testid="lock-screen-button" className={btnClass}>
        <Lock className="w-5 h-5" /> Lock
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button data-testid="set-pin-button" className={btnClass}>
            <KeyRound className="w-5 h-5" /> {user?.pin_set ? "Change PIN" : "Set PIN"}
          </button>
        </DialogTrigger>
        <DialogContent className="ce-dialog">
          <DialogHeader>
            <DialogTitle className="ce-dialog-title">{user?.pin_set ? "Change" : "Set"} screen PIN</DialogTitle>
            <DialogDescription className="ce-note">
              A quick PIN lets you lock the screen between customers without logging out.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={savePin}>
            <div className="ce-field">
              <label>New PIN (4–6 digits)</label>
              <input type="password" inputMode="numeric" maxLength={6} required value={pin} data-testid="new-pin-input"
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="ce-input" style={{ letterSpacing: ".4em" }} />
            </div>
            <div className="ce-field">
              <label>Confirm PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} required value={confirm} data-testid="confirm-pin-input"
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                className="ce-input" style={{ letterSpacing: ".4em" }} />
            </div>
            <div className="ce-field">
              <label>Your account password</label>
              <input type="password" required value={password} data-testid="pin-password-input"
                onChange={(e) => setPassword(e.target.value)} className="ce-input" />
            </div>
            <DialogFooter className="mt-4">
              <button type="submit" disabled={busy} data-testid="save-pin-button"
                className="ce-cta" style={{ width: "100%" }}>
                Save PIN
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

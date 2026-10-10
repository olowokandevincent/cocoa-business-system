import { useState } from "react";
import { api, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useLock } from "@/context/LockContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const btnClass = variant === "mobile"
    ? "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold text-[#3B1E10] hover:bg-[#23372B]/5"
    : "flex gh-btn";

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
        <DialogContent className="bg-[#FAF5EF]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl text-[#3B1E10]">{user?.pin_set ? "Change" : "Set"} screen PIN</DialogTitle>
            <DialogDescription className="text-[#5C4638]">
              A quick PIN lets you lock the screen between customers without logging out.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={savePin} className="space-y-4">
            <div>
              <Label className="text-base font-semibold text-[#24140E]">New PIN (4–6 digits)</Label>
              <Input type="password" inputMode="numeric" maxLength={6} required value={pin} data-testid="new-pin-input"
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58] tracking-[0.4em]" />
            </div>
            <div>
              <Label className="text-base font-semibold text-[#24140E]">Confirm PIN</Label>
              <Input type="password" inputMode="numeric" maxLength={6} required value={confirm} data-testid="confirm-pin-input"
                onChange={(e) => setConfirm(e.target.value.replace(/\D/g, ""))}
                className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58] tracking-[0.4em]" />
            </div>
            <div>
              <Label className="text-base font-semibold text-[#24140E]">Your account password</Label>
              <Input type="password" required value={password} data-testid="pin-password-input"
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={busy} data-testid="save-pin-button"
                className="w-full h-12 bg-[#8C4A27] hover:bg-[#3B1E10] text-white font-bold">Save PIN</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

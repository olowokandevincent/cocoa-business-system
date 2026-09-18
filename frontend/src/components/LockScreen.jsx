import { useState } from "react";
import { api, apiErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Bean, Delete, LogOut } from "lucide-react";

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
    <div className="fixed inset-0 z-[100] bg-[#24140E]" data-testid="lock-screen">
      <img
        src="https://images.pexels.com/photos/37516665/pexels-photo-37516665.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1400"
        alt=""
        className="absolute inset-0 w-full h-full object-cover opacity-25"
      />
      <div className="absolute inset-0 bg-[#24140E]/85" />
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 py-8 overflow-y-auto">
        <div className="w-16 h-16 rounded-full bg-[#8C4A27] flex items-center justify-center mb-4 border-2 border-[#D97706]/50">
          <Bean className="w-8 h-8 text-[#FAF5EF]" />
        </div>
        <h1 className="font-heading text-3xl font-bold text-[#FAF5EF]">Screen locked</h1>
        <p className="text-[#E3D5C5] mt-1 mb-6">Enter {user?.name?.split(" ")[0] || "your"} PIN to continue</p>

        <div className="flex gap-3 mb-6" data-testid="pin-dots">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`w-4 h-4 rounded-full border-2 transition-colors ${i < pin.length ? "bg-[#D97706] border-[#D97706]" : "border-[#8C6D58]"}`} />
          ))}
        </div>

        {error && <div data-testid="pin-error" className="text-[#fca5a5] font-semibold mb-4">{error}</div>}

        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <button key={n} onClick={() => press(String(n))} data-testid={`pin-key-${n}`}
              className="w-20 h-20 rounded-full bg-[#F4ECE1] text-[#24140E] text-3xl font-bold font-mono hover:bg-white active:scale-95 transition-transform">
              {n}
            </button>
          ))}
          <button onClick={back} data-testid="pin-key-back"
            className="w-20 h-20 rounded-full text-[#E3D5C5] flex items-center justify-center hover:bg-[#4d2a17] transition-colors">
            <Delete className="w-7 h-7" />
          </button>
          <button onClick={() => press("0")} data-testid="pin-key-0"
            className="w-20 h-20 rounded-full bg-[#F4ECE1] text-[#24140E] text-3xl font-bold font-mono hover:bg-white active:scale-95 transition-transform">
            0
          </button>
          <button onClick={submit} disabled={busy} data-testid="pin-unlock-button"
            className="w-20 h-20 rounded-full bg-[#1E5E3A] text-white text-lg font-bold hover:bg-[#164a2d] active:scale-95 transition-transform disabled:opacity-60">
            {busy ? "…" : "OK"}
          </button>
        </div>

        <button onClick={() => logout()} data-testid="lock-logout"
          className="mt-8 flex items-center gap-2 text-[#E3D5C5] hover:text-white font-semibold">
          <LogOut className="w-5 h-5" /> Log out instead
        </button>
      </div>
    </div>
  );
}

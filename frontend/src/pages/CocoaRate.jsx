import { useEffect, useState } from "react";
import { api, apiErr, naira, fmtDateTime } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp, Loader2, Pencil, Globe, WifiOff, Calculator as CalcIcon, History,
} from "lucide-react";
import { toast } from "sonner";

export default function CocoaRate() {
  const { user } = useAuth();
  const [rate, setRate] = useState(null);
  const [live, setLive] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ rate: "", note: "" });
  const [kg, setKg] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/cocoa-rate");
      setRate(data);
      setForm({ rate: data.rate || "", note: "" });
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  useEffect(() => {
    load();
    api.get("/cocoa-rate/live").then((r) => setLive(r.data)).catch(() => setLive({ available: false }));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      await api.post("/cocoa-rate", { rate: Number(form.rate), note: form.note });
      toast.success("Buying rate updated");
      setOpen(false);
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const payout = kg && rate?.rate ? Number(kg) * rate.rate : 0;

  if (!rate)
    return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8C4A27]" /></div>;

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-4xl font-bold text-[#3B1E10] flex items-center gap-3">
            <TrendingUp className="w-9 h-9 text-[#8C4A27]" /> Cocoa Rate
          </h1>
          <p className="text-lg text-[#5C4638] mt-1">Private buying rate and live global reference.</p>
        </div>
        {user?.role === "admin" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="edit-rate-button"
                className="h-14 px-6 text-lg font-bold bg-[#8C4A27] hover:bg-[#3B1E10] text-white border-2 border-[#3B1E10]/20">
                <Pencil className="w-5 h-5 mr-2" /> Set Rate
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#FAF5EF]">
              <DialogHeader><DialogTitle className="font-heading text-2xl text-[#3B1E10]">Set Buying Rate (₦/kg)</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Rate per kg (₦) *</Label>
                  <Input type="number" step="0.01" required value={form.rate} data-testid="rate-input"
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                    className="mt-1 h-14 text-xl bg-white border-2 border-[#8C6D58]" />
                </div>
                <div>
                  <Label className="text-base font-semibold">Note</Label>
                  <Input value={form.note} data-testid="rate-note-input" placeholder="e.g. Season opening rate"
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]" />
                </div>
                <DialogFooter>
                  <Button type="submit" data-testid="save-rate-button"
                    className="w-full h-12 text-lg font-bold bg-[#8C4A27] hover:bg-[#3B1E10] text-white">Save Rate</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Buying rate */}
        <Card className="p-8 bg-[#3B1E10] text-[#FAF5EF] border-2 border-[#8C4A27] rounded-xl">
          <div className="text-base font-semibold text-[#E3D5C5] uppercase tracking-wide">Our Buying Rate</div>
          <div className="font-heading text-6xl font-bold mt-2 text-[#D97706]" data-testid="current-rate">
            {rate.rate ? naira(rate.rate) : "Not set"}
          </div>
          {rate.rate && <div className="text-lg text-[#E3D5C5] mt-1">per kilogram</div>}
          {rate.updated_at && (
            <div className="text-sm text-[#E3D5C5] mt-4">
              Updated {fmtDateTime(rate.updated_at)} by {rate.updated_by}
            </div>
          )}
        </Card>

        {/* Live global reference */}
        <Card className="p-8 bg-white border-2 border-[#8C6D58]/30 rounded-xl" data-testid="live-rate-card">
          <div className="flex items-center gap-2 text-[#5C4638] mb-2">
            {live?.available ? <Globe className="w-5 h-5 text-[#1E5E3A]" /> : <WifiOff className="w-5 h-5" />}
            <span className="text-base font-semibold uppercase tracking-wide">Live Global Cocoa Price</span>
          </div>
          {!live ? (
            <Loader2 className="w-8 h-8 animate-spin text-[#8C4A27] mt-4" />
          ) : live.available ? (
            <>
              <div className="font-heading text-5xl font-bold text-[#1E5E3A] mt-2">
                ${live.usd_per_kg?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="text-2xl text-[#5C4638] font-normal"> /kg</span>
              </div>
              <div className="text-lg text-[#5C4638] mt-1">
                ${live.usd_per_tonne?.toLocaleString()} per metric tonne
              </div>
              <div className="text-sm text-[#5C4638] mt-4">
                As of {live.date} · Source: global market{live.source === "cache" ? " (cached)" : ""}
              </div>
            </>
          ) : (
            <div className="mt-4 bg-[#F4ECE1] rounded-lg p-4 border border-[#E3D5C5]">
              <p className="text-lg font-semibold text-[#24140E]">Live price unavailable</p>
              <p className="text-[#5C4638] mt-1">
                {live.message || "The internet-based global rate source is not reachable right now."} Your private buying rate above still works fully offline.
              </p>
            </div>
          )}
        </Card>

        {/* Payout calculator */}
        <Card className="p-6 bg-[#F4ECE1] border-2 border-[#8C6D58]/40 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <CalcIcon className="w-5 h-5 text-[#8C4A27]" />
            <h3 className="font-heading text-xl font-semibold text-[#3B1E10]">Payout Calculator</h3>
          </div>
          <Label className="text-base font-semibold">Weight (kg)</Label>
          <Input type="number" value={kg} data-testid="payout-kg-input"
            onChange={(e) => setKg(e.target.value)} placeholder="Enter kg"
            className="mt-1 h-14 text-xl bg-white border-2 border-[#8C6D58]" />
          <div className="mt-4 bg-white rounded-lg p-4 border border-[#E3D5C5]">
            <div className="text-sm text-[#5C4638] uppercase tracking-wide">Estimated payout</div>
            <div className="font-mono text-3xl font-bold text-[#1E5E3A]" data-testid="payout-result">
              {rate.rate ? naira(payout) : "Set a rate first"}
            </div>
            {rate.rate && kg && <div className="text-sm text-[#5C4638] mt-1">{kg} kg × {naira(rate.rate)}/kg</div>}
          </div>
        </Card>

        {/* History */}
        <Card className="p-6 bg-white border-2 border-[#8C6D58]/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-[#8C4A27]" />
            <h3 className="font-heading text-xl font-semibold text-[#3B1E10]">Rate History</h3>
          </div>
          {rate.history?.length ? (
            <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="rate-history">
              {rate.history.map((h, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#F4ECE1] border border-[#E3D5C5]">
                  <div>
                    <div className="font-mono font-bold text-[#24140E]">{naira(h.rate)}/kg</div>
                    <div className="text-xs text-[#5C4638]">{fmtDateTime(h.date)} · {h.by}{h.note ? ` · ${h.note}` : ""}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#5C4638]">No rate changes recorded yet.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

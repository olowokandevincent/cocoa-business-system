import { useEffect, useState } from "react";
import { api, apiErr, naira, fmtDateTime } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { PODS_DRYING } from "@/styles/imagery";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  TrendingUp, Loader2, Pencil, Globe, WifiOff, Calculator as CalcIcon, History,
  ArrowUp, ArrowDown, Minus, LineChart as LineChartIcon,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { toast } from "sonner";

export default function CocoaRate() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
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
  }, []);

  // Owner-only: the world market keeps ticking, so this page keeps pulling.
  useEffect(() => {
    if (!isAdmin) return;
    let stop = false;
    const pull = () =>
      api.get("/cocoa-rate/live")
        .then((r) => !stop && setLive(r.data))
        .catch(() => !stop && setLive({ available: false }));
    pull();
    const t = setInterval(pull, 30000);
    return () => { stop = true; clearInterval(t); };
  }, [isAdmin]);

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
  const nairaSeries = live?.trend_ngn?.length > 1 ? live.trend_ngn : null;
  const worldSeries = live?.trend?.length > 1 ? live.trend : null;
  const series = nairaSeries || worldSeries;

  if (!rate)
    return (
      <div className="ce-spin"><Loader2 className="w-10 h-10 animate-spin" /></div>
    );

  return (
    <div className="ce-page ce-stack">
      <PageHeader
        eyebrow="What a kilo is worth" image={PODS_DRYING}
        title="Cocoa rate"
        subtitle={isAdmin
          ? "Your private buying rate, and the world market it sits against."
          : "The buying rate set by the owner — buy cocoa at this price."}
        actions={isAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button data-testid="edit-rate-button" className="ce-cta">
                <Pencil /> Set rate
              </button>
            </DialogTrigger>
            <DialogContent className="ce-dialog">
              <DialogHeader>
                <DialogTitle className="ce-dialog-title">Set buying rate (₦/kg)</DialogTitle>
              </DialogHeader>
              <form onSubmit={save}>
                <div className="ce-field">
                  <label>Rate per kg (₦) *</label>
                  <input type="number" step="0.01" required value={form.rate} data-testid="rate-input"
                    onChange={(e) => setForm({ ...form, rate: e.target.value })}
                    className="ce-input" placeholder="e.g. 1850" />
                </div>
                <div className="ce-field">
                  <label>Note</label>
                  <input value={form.note} data-testid="rate-note-input" placeholder="e.g. Season opening rate"
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="ce-input" />
                </div>
                <DialogFooter className="mt-4">
                  <button type="submit" data-testid="save-rate-button" className="ce-cta" style={{ width: "100%" }}>
                    Save rate
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Our buying rate */}
        <div className="ce-card ce-card-dark ce-rise ce-d1">
          <div className="ce-eyebrow">Our buying rate</div>
          <div className="ce-figure" style={{ marginTop: 12, fontSize: "clamp(38px,5vw,58px)", color: "#F0B457" }}
            data-testid="current-rate">
            {rate.rate ? naira(rate.rate) : "Not set"}
          </div>
          {rate.rate && <div className="ce-note" style={{ marginTop: 6 }}>per kilogram</div>}
          {rate.updated_at && (
            <div className="ce-note" style={{ marginTop: 14, fontSize: 13 }}>
              Updated {fmtDateTime(rate.updated_at)} by {rate.updated_by}
            </div>
          )}
        </div>

        {/* Live global reference (owner only) */}
        {isAdmin ? (
          <div className="ce-card ce-rise ce-d2" data-testid="live-rate-card">
            <div className="ce-card-title">
              {live?.available ? <Globe style={{ color: "#1E5B38" }} /> : <WifiOff style={{ color: "#8A6A4E" }} />}
              Live global cocoa price
            </div>
            {!live ? (
              <div className="ce-spin" style={{ padding: "28px 0" }}><Loader2 className="w-8 h-8 animate-spin" /></div>
            ) : live.available ? (
              <>
                <div className="flex items-end justify-between gap-4 flex-wrap" style={{ marginTop: 12 }}>
                  <div>
                    <div className="ce-figure gr" style={{ fontSize: 46 }}>
                      ${live.usd_per_kg?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span style={{ fontSize: 22, color: "#6E553F", fontWeight: 600 }}> /kg</span>
                    </div>
                    <div className="ce-note" style={{ marginTop: 6 }}>
                      ${live.usd_per_tonne?.toLocaleString()} per metric tonne
                      {live.ngn_per_kg ? <> · ≈ <b>{naira(live.ngn_per_kg)}/kg</b> at ₦{live.usdngn?.toLocaleString()}/$</> : null}
                    </div>
                  </div>
                  {live.change_pct != null && (
                    <div data-testid="live-rate-change"
                      className={`ce-chip ${live.direction === "up" ? "up" : live.direction === "down" ? "down" : ""}`}>
                      {live.direction === "up" ? <ArrowUp /> : live.direction === "down" ? <ArrowDown /> : <Minus />}
                      {Math.abs(live.change_pct)}%
                    </div>
                  )}
                </div>

                {series && (
                  <div style={{ height: 160, marginTop: 16, marginLeft: -8 }} data-testid="live-rate-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={series}>
                        <defs>
                          <linearGradient id="ceLiveGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2E7D4F" stopOpacity={0.4} />
                            <stop offset="100%" stopColor="#2E7D4F" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,58,21,.18)" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6E553F" }} tickFormatter={(d) => (d || "").slice(0, 7)} minTickGap={24} />
                        <YAxis tick={{ fontSize: 11, fill: "#6E553F" }} domain={["auto", "auto"]} width={52}
                          tickFormatter={(v) => (nairaSeries ? `₦${Math.round(v / 1000)}k` : `$${v}`)} />
                        <Tooltip
                          formatter={(v) => [nairaSeries ? `${naira(v)}/kg` : `$${v}/kg`, "Market"]}
                          contentStyle={{ borderRadius: 14, border: "1px solid rgba(138,58,21,.35)", background: "#FFFCF6", color: "#2B1A0F" }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#1E5B38" strokeWidth={3} fill="url(#ceLiveGrad)" animationDuration={1400} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="ce-note" style={{ marginTop: 10, fontSize: 13 }}>
                  As of {live.date} · Source: global market{live.source === "cache" ? " (cached)" : ""}
                  {nairaSeries ? " · converted to naira" : ""}
                </div>
              </>
            ) : (
              <p className="ce-note" style={{ marginTop: 12 }}>
                {live.message || "The internet-based global rate source is not reachable right now."}{" "}
                Your private buying rate on the left still works fully offline.
              </p>
            )}
          </div>
        ) : (
          <div className="ce-card ce-card-leaf ce-rise ce-d2" data-testid="staff-rate-note">
            <div className="ce-card-title" style={{ color: "#1E5B38" }}><Globe /> Live global market</div>
            <div className="ce-figure" style={{ fontSize: 30, marginTop: 12 }}>Owner only</div>
            <p className="ce-note" style={{ marginTop: 8 }}>
              The live world market price is private to the owner. Buy cocoa at{" "}
              <b>{rate.rate ? naira(rate.rate) + "/kg" : "the owner's rate"}</b> shown on the left.
            </p>
          </div>
        )}

        {/* Your rate movement chart */}
        <div className="ce-card lg:col-span-2 ce-rise ce-d3" data-testid="rate-movement-card">
          <div className="ce-card-title"><LineChartIcon style={{ color: "#A8451C" }} /> Your buying rate movement (₦/kg)</div>
          {rate.history?.length > 1 ? (
            <div style={{ height: 230, marginTop: 16 }} data-testid="rate-movement-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...rate.history].reverse().map((h) => ({ date: fmtDateTime(h.date).split(",")[0], rate: h.rate }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(138,58,21,.18)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6E553F" }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 11, fill: "#6E553F" }} domain={["auto", "auto"]} width={64}
                    tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => [naira(v), "Rate/kg"]}
                    contentStyle={{ borderRadius: 14, border: "1px solid rgba(138,58,21,.35)", background: "#FFFCF6" }} />
                  <Line type="monotone" dataKey="rate" stroke="#A8451C" strokeWidth={3}
                    dot={{ r: 4, fill: "#F0B457" }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="ce-note" style={{ marginTop: 12 }}>
              Set the rate a few times and this chart shows how your buying price moves over the season.
            </p>
          )}
        </div>

        {/* Payout calculator */}
        <div className="ce-card ce-card-leaf ce-rise ce-d4">
          <div className="ce-card-title" style={{ color: "#1E5B38" }}><CalcIcon /> Payout calculator</div>
          <div className="ce-field">
            <label>Weight (kg)</label>
            <input type="number" value={kg} data-testid="payout-kg-input" placeholder="Enter kg"
              onChange={(e) => setKg(e.target.value)} className="ce-input" />
          </div>
          <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 14, background: "#FFFCF6", border: "1px solid rgba(46,125,79,.28)" }}>
            <div className="ce-label">Estimated payout</div>
            <div className="ce-figure gr" style={{ fontSize: 32, marginTop: 6 }} data-testid="payout-result">
              {rate.rate ? naira(payout) : "Set a rate first"}
            </div>
            {rate.rate && kg && <div className="ce-note" style={{ marginTop: 4 }}>{kg} kg × {naira(rate.rate)}/kg</div>}
          </div>
        </div>

        {/* History */}
        <div className="ce-card ce-rise ce-d5">
          <div className="ce-card-title"><History style={{ color: "#A8451C" }} /> Rate history</div>
          {rate.history?.length ? (
            <div className="space-y-2" style={{ marginTop: 14, maxHeight: 268, overflowY: "auto" }} data-testid="rate-history">
              {rate.history.map((h, i) => (
                <div key={i} style={{ padding: "10px 14px", borderRadius: 13, background: "#FFFCF6", border: "1px solid rgba(138,58,21,.18)" }}>
                  <div className="ce-figure" style={{ fontSize: 18 }}>{naira(h.rate)}/kg</div>
                  <div className="ce-note" style={{ fontSize: 13, marginTop: 2 }}>
                    {fmtDateTime(h.date)} · {h.by}{h.note ? ` · ${h.note}` : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="ce-note" style={{ marginTop: 12 }}>No rate changes recorded yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

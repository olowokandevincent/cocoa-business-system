import { useEffect, useState, useCallback } from "react";
import { api, apiErr, fmtDateTime } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { PODS_CLOSE } from "@/styles/imagery";
import { Calculator } from "@/components/Calculator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Package, Plus, Loader2, Scale, TriangleAlert, CircleCheck, Info, Trash2, Truck, MapPin, Calendar, X,
} from "lucide-react";
import { toast } from "sonner";

const EMPTY = { bags: "", status: "unscaled", weight_kg: "", delivered_by: "", location: "", note: "" };

export default function CocoaRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState(null);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [weighOpen, setWeighOpen] = useState(null);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState("");

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        api.get("/cocoa-records", { params: { status: filter, date } }),
        api.get("/cocoa-records/summary"),
      ]);
      setRecords(r.data);
      setSummary(s.data);
    } catch (e) {
      toast.error(apiErr(e));
    }
  }, [filter, date]);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        bags: Number(form.bags) || 0,
        status: form.status,
        weight_kg: form.status === "scaled" ? Number(form.weight_kg) || 0 : null,
        delivered_by: form.delivered_by, location: form.location, note: form.note,
      };
      await api.post("/cocoa-records", payload);
      toast.success("Cocoa arrival recorded");
      setAddOpen(false);
      setForm(EMPTY);
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const enterWeight = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/cocoa-records/${weighOpen.id}/weight`, { weight_kg: Number(weight) });
      toast.success("Weight recorded — marked as scaled");
      setWeighOpen(null);
      setWeight("");
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const del = async (rid) => {
    try {
      await api.delete(`/cocoa-records/${rid}`);
      toast.success("Record deleted");
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  return (
    <div className="ce-page ce-stack">
      <PageHeader
        eyebrow="From the farm to the store" image={PODS_CLOSE}
        title="Cocoa store"
        subtitle="Every delivery that arrives, weighed or waiting for the scale."
        actions={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <button data-testid="add-cocoa-record-button" className="ce-cta">
                <Plus /> Record arrival
              </button>
            </DialogTrigger>
            <DialogContent className="ce-dialog max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="ce-dialog-title">Record cocoa arrival</DialogTitle>
              </DialogHeader>
              <p className="ce-note" style={{ display: "flex", gap: 8 }}>
                <Info style={{ width: 20, height: 20, flex: "none", color: "#A8451C" }} />
                Cocoa arriving does not belong to a customer just because they brought it — this is
                general store stock.
              </p>
              <form onSubmit={submit}>
                <div className="grid grid-cols-2 gap-x-3">
                  <div className="ce-field">
                    <label>Bags delivered</label>
                    <input type="number" step="0.1" value={form.bags} data-testid="cocoa-bags-input"
                      onChange={(e) => setForm({ ...form, bags: e.target.value })}
                      className="ce-input" placeholder="0" />
                  </div>
                  <div className="ce-field">
                    <label>Status</label>
                    <div className="flex gap-2" style={{ marginTop: 8 }}>
                      <button type="button" data-testid="status-unscaled"
                        onClick={() => setForm({ ...form, status: "unscaled" })}
                        className={`ce-pill flex-1 ${form.status === "unscaled" ? "on" : ""}`}>
                        Unscaled
                      </button>
                      <button type="button" data-testid="status-scaled"
                        onClick={() => setForm({ ...form, status: "scaled" })}
                        className={`ce-pill flex-1 ${form.status === "scaled" ? "on" : ""}`}>
                        Scaled
                      </button>
                    </div>
                  </div>
                </div>

                {form.status === "scaled" && (
                  <div className="ce-field">
                    <label>Weight (kg) *</label>
                    <input type="number" step="0.01" required value={form.weight_kg} data-testid="cocoa-weight-input"
                      onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                      className="ce-input" placeholder="0.00" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-x-3">
                  <div className="ce-field">
                    <label>Delivered by / truck</label>
                    <input value={form.delivered_by} onChange={(e) => setForm({ ...form, delivered_by: e.target.value })}
                      className="ce-input" placeholder="Name or plate" />
                  </div>
                  <div className="ce-field">
                    <label>Store location / bay</label>
                    <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                      className="ce-input" placeholder="e.g. Bay 2" />
                  </div>
                </div>

                <div className="ce-field">
                  <label>Note</label>
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="ce-input" rows={2} placeholder="Anything to remember about this load" />
                </div>

                <DialogFooter className="mt-4">
                  <button type="submit" data-testid="save-cocoa-record-button"
                    className="ce-cta" style={{ width: "100%" }}>Save arrival</button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Store summary */}
      {summary && (
        <div className="grid md:grid-cols-3 gap-5">
          <div className="ce-card ce-card-leaf md:col-span-2 ce-rise ce-d1">
            <div className="ce-card-title" style={{ color: "#1E5B38" }}>
              <Package /> Currently in store
            </div>
            <p className="ce-note" style={{ marginTop: 10, fontSize: 16.5, color: "#2B1A0F" }} data-testid="cocoa-store-summary">
              {summary.description}
            </p>
          </div>
          <div className={`ce-card ce-rise ce-d2 ${summary.unscaled_records > 0 ? "ce-card-alert pulse-warn" : ""}`}>
            <div className="ce-card-title" style={{ color: summary.unscaled_records > 0 ? "#8F1D1D" : "#2B1A0F" }}>
              <TriangleAlert /> Unscaled
            </div>
            <div className="ce-figure rd" style={{ fontSize: 42, marginTop: 10 }}
              data-testid="unscaled-summary-count">{summary.unscaled_records}</div>
            <div className="ce-note">deliveries awaiting weight</div>
          </div>
        </div>
      )}

      {/* Filter + date */}
      <div className="flex flex-wrap items-center gap-3" data-testid="cocoa-filter">
        {[["", "All"], ["unscaled", "Unscaled"], ["scaled", "Scaled"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} data-testid={`filter-${v || "all"}`}
            className={`ce-pill ${filter === v ? "on" : ""}`}>
            {l}
          </button>
        ))}
        <div className="flex items-center gap-2 sm:ml-auto">
          <Calendar style={{ width: 20, height: 20, color: "#F0B457" }} />
          <input type="date" value={date} data-testid="cocoa-date-picker"
            onChange={(e) => setDate(e.target.value)}
            className="ce-input" style={{ marginTop: 0, width: 190 }} />
          {date && (
            <button onClick={() => setDate("")} data-testid="clear-date" className="ce-pill">
              <X style={{ width: 16, height: 16, display: "inline", verticalAlign: "-3px" }} /> Clear
            </button>
          )}
        </div>
      </div>
      {date && (
        <div className="ce-note" data-testid="date-filter-note" style={{ color: "#E3D0B4" }}>
          Showing deliveries &amp; weighings recorded on <b style={{ color: "#FFF6E6" }}>{date}</b>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {!records ? (
            <div className="ce-spin"><Loader2 className="w-10 h-10 animate-spin" /></div>
          ) : records.length === 0 ? (
            <div className="ce-empty">
              <Package />
              <b>No deliveries here yet</b>
              <span>Record an arrival and it will appear in this list.</span>
            </div>
          ) : (
            <div className="space-y-3" data-testid="cocoa-records-list">
              {records.map((r, i) => (
                <article key={r.id} data-testid={`cocoa-record-${r.id}`}
                  className={`ce-card ce-rise ce-d${(i % 4) + 1} ${r.status === "unscaled" ? "ce-card-alert" : ""}`}
                  style={{ padding: "18px 20px" }}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4">
                      <span className="ce-id" style={{ borderRadius: 14, minWidth: 50 }}>
                        {r.status === "unscaled" ? <TriangleAlert style={{ width: 22, height: 22 }} /> : <CircleCheck style={{ width: 22, height: 22 }} />}
                      </span>
                      <div>
                        <div className="ce-row-title">
                          {r.status === "scaled" ? `${(r.weight_kg || 0).toLocaleString()} kg` : "Unscaled delivery"}
                          {r.bags ? ` · ${r.bags} bag(s)` : ""}
                        </div>
                        <div className="ce-row-meta" style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6 }}>
                          <span>{fmtDateTime(r.created_at)}</span>
                          {r.delivered_by && <span className="flex items-center gap-1"><Truck style={{ width: 15, height: 15 }} />{r.delivered_by}</span>}
                          {r.location && <span className="flex items-center gap-1"><MapPin style={{ width: 15, height: 15 }} />{r.location}</span>}
                        </div>
                        {r.note && <div className="ce-note" style={{ fontStyle: "italic", marginTop: 6 }}>“{r.note}”</div>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {r.status === "unscaled" && (
                        <button onClick={() => { setWeighOpen(r); setWeight(""); }}
                          data-testid={`enter-weight-button-${r.id}`} className="ce-cta sm">
                          <Scale /> Enter weight
                        </button>
                      )}
                      {user?.role === "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button data-testid={`delete-record-${r.id}`} aria-label="Delete record"
                              className="ce-pen" style={{ background: "rgba(176,32,32,.12)", borderColor: "rgba(176,32,32,.35)", color: "#8F1D1D" }}>
                              <Trash2 />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="ce-dialog">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="ce-dialog-title" style={{ color: "#8F1D1D" }}>
                                Delete this record?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="ce-note">
                                The record is removed from the store ledger for good.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="ce-pill">Cancel</AlertDialogCancel>
                              <AlertDialogAction asChild>
                                <button onClick={() => del(r.id)} className="ce-cta rust sm">Delete</button>
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
        <div>
          <Calculator title="Bag & weight calculator" />
        </div>
      </div>

      {/* Enter weight dialog */}
      <Dialog open={!!weighOpen} onOpenChange={(o) => !o && setWeighOpen(null)}>
        <DialogContent className="ce-dialog">
          <DialogHeader>
            <DialogTitle className="ce-dialog-title">Enter weight</DialogTitle>
          </DialogHeader>
          <form onSubmit={enterWeight}>
            <div className="ce-field">
              <label>Scaled weight (kg) *</label>
              <input type="number" step="0.01" required autoFocus value={weight} data-testid="weight-entry-input"
                onChange={(e) => setWeight(e.target.value)} className="ce-input" placeholder="0.00" />
            </div>
            <DialogFooter className="mt-4">
              <button type="submit" data-testid="save-weight-button" className="ce-cta leaf" style={{ width: "100%" }}>
                Save &amp; mark scaled
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

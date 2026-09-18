import { useEffect, useState, useCallback } from "react";
import { api, apiErr, fmtDateTime } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calculator } from "@/components/Calculator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Package, Plus, Loader2, Scale, TriangleAlert, CircleCheck, Info, Trash2, Truck, MapPin,
} from "lucide-react";
import { toast } from "sonner";

export default function CocoaRecords() {
  const { user } = useAuth();
  const [records, setRecords] = useState(null);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ bags: "", status: "unscaled", weight_kg: "", delivered_by: "", location: "", note: "" });
  const [weighOpen, setWeighOpen] = useState(null);
  const [weight, setWeight] = useState("");

  const load = useCallback(async () => {
    try {
      const [r, s] = await Promise.all([
        api.get("/cocoa-records", { params: { status: filter } }),
        api.get("/cocoa-records/summary"),
      ]);
      setRecords(r.data);
      setSummary(s.data);
    } catch (e) {
      toast.error(apiErr(e));
    }
  }, [filter]);

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
      setForm({ bags: "", status: "unscaled", weight_kg: "", delivered_by: "", location: "", note: "" });
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
    <div className="animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-4xl font-bold text-[#3B1E10]">Cocoa Store Records</h1>
          <p className="text-lg text-[#5C4638] mt-1">Cocoa arriving at the store — scaled and unscaled.</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-cocoa-record-button"
              className="h-14 px-6 text-lg font-bold bg-[#8C4A27] hover:bg-[#3B1E10] text-white border-2 border-[#3B1E10]/20">
              <Plus className="w-5 h-5 mr-2" /> Record Arrival
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FAF5EF] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle className="font-heading text-2xl text-[#3B1E10]">Record Cocoa Arrival</DialogTitle></DialogHeader>
            <div className="bg-[#F4ECE1] border border-[#E3D5C5] rounded-lg p-3 text-sm text-[#5C4638] flex gap-2">
              <Info className="w-5 h-5 text-[#8C4A27] shrink-0" />
              Cocoa arriving does NOT belong to a customer just because they brought it. This is general store stock.
            </div>
            <form onSubmit={submit} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-base font-semibold">Bags delivered</Label>
                  <Input type="number" step="0.1" value={form.bags} data-testid="cocoa-bags-input"
                    onChange={(e) => setForm({ ...form, bags: e.target.value })}
                    className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]" />
                </div>
                <div>
                  <Label className="text-base font-semibold">Status</Label>
                  <div className="mt-1 flex gap-2">
                    <button type="button" data-testid="status-unscaled"
                      onClick={() => setForm({ ...form, status: "unscaled" })}
                      className={`flex-1 h-12 rounded-lg font-semibold border-2 ${form.status === "unscaled" ? "bg-[#9A3412] text-white border-[#9A3412]" : "bg-white text-[#24140E] border-[#8C6D58]"}`}>
                      Unscaled
                    </button>
                    <button type="button" data-testid="status-scaled"
                      onClick={() => setForm({ ...form, status: "scaled" })}
                      className={`flex-1 h-12 rounded-lg font-semibold border-2 ${form.status === "scaled" ? "bg-[#1E5E3A] text-white border-[#1E5E3A]" : "bg-white text-[#24140E] border-[#8C6D58]"}`}>
                      Scaled
                    </button>
                  </div>
                </div>
              </div>
              {form.status === "scaled" && (
                <div>
                  <Label className="text-base font-semibold">Weight (kg) *</Label>
                  <Input type="number" step="0.01" required value={form.weight_kg} data-testid="cocoa-weight-input"
                    onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                    className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-base font-semibold">Delivered by / truck</Label>
                  <Input value={form.delivered_by} onChange={(e) => setForm({ ...form, delivered_by: e.target.value })}
                    className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]" />
                </div>
                <div>
                  <Label className="text-base font-semibold">Store location / bay</Label>
                  <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]" />
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Note</Label>
                <Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="mt-1 text-lg bg-white border-2 border-[#8C6D58]" />
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="save-cocoa-record-button"
                  className="w-full h-12 text-lg font-bold bg-[#8C4A27] hover:bg-[#3B1E10] text-white">Save Arrival</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Store summary */}
      {summary && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card className="p-5 bg-white border-2 border-[#8C6D58]/30 md:col-span-2">
            <div className="flex items-center gap-2 text-[#1E5E3A] mb-2">
              <Package className="w-6 h-6" /> <span className="font-heading text-xl font-bold">Currently in Store</span>
            </div>
            <p className="text-lg text-[#24140E] leading-relaxed" data-testid="cocoa-store-summary">{summary.description}</p>
          </Card>
          <Card className={`p-5 border-2 ${summary.unscaled_records > 0 ? "bg-[#FEF2F2] border-[#DC2626] pulse-warn" : "bg-white border-[#8C6D58]/30"}`}>
            <div className="flex items-center gap-2 mb-2">
              <TriangleAlert className={`w-6 h-6 ${summary.unscaled_records > 0 ? "text-[#DC2626]" : "text-[#8C6D58]"}`} />
              <span className="font-heading text-xl font-bold text-[#24140E]">Unscaled</span>
            </div>
            <div className="font-mono text-4xl font-bold text-[#991B1B]" data-testid="unscaled-summary-count">{summary.unscaled_records}</div>
            <div className="text-sm text-[#5C4638]">deliveries awaiting weight</div>
          </Card>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4" data-testid="cocoa-filter">
        {[["", "All"], ["unscaled", "Unscaled"], ["scaled", "Scaled"]].map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)} data-testid={`filter-${v || "all"}`}
            className={`h-11 px-5 rounded-lg font-semibold border-2 transition-colors ${
              filter === v ? "bg-[#3B1E10] text-white border-[#3B1E10]" : "bg-white text-[#24140E] border-[#8C6D58]/40 hover:border-[#8C4A27]"}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {!records ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8C4A27]" /></div>
          ) : records.length === 0 ? (
            <Card className="p-12 text-center bg-white border-2 border-[#8C6D58]/30">
              <Package className="w-12 h-12 mx-auto text-[#8C6D58] mb-3" />
              <p className="text-xl font-semibold text-[#24140E]">No records here yet</p>
            </Card>
          ) : (
            <div className="space-y-3" data-testid="cocoa-records-list">
              {records.map((r) => (
                <Card key={r.id} data-testid={`cocoa-record-${r.id}`}
                  className={`p-5 border-2 ${r.status === "unscaled" ? "bg-[#FEF2F2] border-[#DC2626]/60" : "bg-white border-[#8C6D58]/30"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${r.status === "unscaled" ? "bg-[#DC2626]" : "bg-[#1E5E3A]"}`}>
                        {r.status === "unscaled" ? <TriangleAlert className="w-6 h-6 text-white" /> : <CircleCheck className="w-6 h-6 text-white" />}
                      </div>
                      <div>
                        <div className="font-heading text-xl font-bold text-[#24140E]">
                          {r.status === "scaled"
                            ? `${(r.weight_kg || 0).toLocaleString()} kg`
                            : "Unscaled delivery"}
                          {r.bags ? ` · ${r.bags} bag(s)` : ""}
                        </div>
                        <div className="text-sm text-[#5C4638] flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          <span>{fmtDateTime(r.created_at)}</span>
                          {r.delivered_by && <span className="flex items-center gap-1"><Truck className="w-4 h-4" />{r.delivered_by}</span>}
                          {r.location && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{r.location}</span>}
                        </div>
                        {r.note && <div className="text-sm text-[#5C4638] mt-1 italic">"{r.note}"</div>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 items-end">
                      {r.status === "unscaled" && (
                        <Button onClick={() => { setWeighOpen(r); setWeight(""); }}
                          data-testid={`enter-weight-button-${r.id}`}
                          className="h-10 bg-[#8C4A27] hover:bg-[#3B1E10] text-white font-bold whitespace-nowrap">
                          <Scale className="w-4 h-4 mr-1" /> Enter Weight
                        </Button>
                      )}
                      {user?.role === "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button data-testid={`delete-record-${r.id}`} className="text-[#991B1B] p-2 hover:bg-[#FEF2F2] rounded-lg">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-[#FAF5EF]">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-heading text-xl text-[#991B1B]">Delete this record?</AlertDialogTitle>
                              <AlertDialogDescription className="text-[#5C4638]">This confirmed record will be permanently removed.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => del(r.id)} className="h-11 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold">Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
        <div>
          <Calculator title="Bag & Weight Calculator" />
        </div>
      </div>

      {/* Enter weight dialog */}
      <Dialog open={!!weighOpen} onOpenChange={(o) => !o && setWeighOpen(null)}>
        <DialogContent className="bg-[#FAF5EF]">
          <DialogHeader><DialogTitle className="font-heading text-2xl text-[#3B1E10]">Enter Weight</DialogTitle></DialogHeader>
          <form onSubmit={enterWeight} className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Scaled weight (kg) *</Label>
              <Input type="number" step="0.01" required autoFocus value={weight} data-testid="weight-entry-input"
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1 h-14 text-xl bg-white border-2 border-[#8C6D58]" />
            </div>
            <DialogFooter>
              <Button type="submit" data-testid="save-weight-button"
                className="w-full h-12 text-lg font-bold bg-[#1E5E3A] hover:bg-[#164a2d] text-white">
                Save & Mark Scaled
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

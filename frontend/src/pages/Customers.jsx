import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErr, naira, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Search, UserPlus, Users, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", notes: "" });
  const [caretakers, setCaretakers] = useState([]);

  const load = useCallback(async (q = "") => {
    try {
      const { data } = await api.get("/customers", { params: { search: q } });
      setCustomers(data);
    } catch (e) {
      toast.error(apiErr(e));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search, load]);

  const addCaretaker = () => setCaretakers((c) => [...c, { name: "", phone: "", relationship: "" }]);
  const updateCaretaker = (i, k, v) =>
    setCaretakers((c) => c.map((ct, idx) => (idx === i ? { ...ct, [k]: v } : ct)));
  const removeCaretaker = (i) => setCaretakers((c) => c.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, caretakers: caretakers.filter((c) => c.name.trim()) };
      const { data } = await api.post("/customers", payload);
      toast.success(`Customer #${data.customer_id} added`);
      setOpen(false);
      setForm({ full_name: "", phone: "", address: "", notes: "" });
      setCaretakers([]);
      load(search);
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-heading text-4xl font-bold text-[#3B1E10]">Customers</h1>
          <p className="text-lg text-[#5C4638] mt-1 flex items-center gap-2">
            <Users className="w-5 h-5" />
            <span data-testid="customer-total-count" className="font-bold text-[#24140E]">
              {customers?.length ?? "—"}
            </span>
            total {search && "matching"}
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              data-testid="add-customer-button"
              className="h-14 px-6 text-lg font-bold bg-[#8C4A27] hover:bg-[#3B1E10] text-white border-2 border-[#3B1E10]/20"
            >
              <UserPlus className="w-5 h-5 mr-2" /> Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-[#FAF5EF] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading text-2xl text-[#3B1E10]">New Customer</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Full name *</Label>
                <Input
                  data-testid="customer-name-input"
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-base font-semibold">Phone</Label>
                  <Input
                    data-testid="customer-phone-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]"
                  />
                </div>
                <div>
                  <Label className="text-base font-semibold">Address</Label>
                  <Input
                    data-testid="customer-address-input"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]"
                  />
                </div>
              </div>
              <div>
                <Label className="text-base font-semibold">Notes</Label>
                <Textarea
                  data-testid="customer-notes-input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-1 text-lg bg-white border-2 border-[#8C6D58]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-base font-semibold">Caretakers</Label>
                  <Button type="button" variant="outline" onClick={addCaretaker}
                    data-testid="add-caretaker-button"
                    className="h-9 border-2 border-[#8C6D58]/40 text-[#24140E]">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {caretakers.map((ct, i) => (
                    <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-[#E3D5C5]">
                      <Input placeholder="Name" value={ct.name} data-testid={`caretaker-name-${i}`}
                        onChange={(e) => updateCaretaker(i, "name", e.target.value)}
                        className="h-10 bg-white border border-[#8C6D58]" />
                      <Input placeholder="Relationship" value={ct.relationship}
                        onChange={(e) => updateCaretaker(i, "relationship", e.target.value)}
                        className="h-10 bg-white border border-[#8C6D58]" />
                      <button type="button" onClick={() => removeCaretaker(i)} className="text-[#991B1B] p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" disabled={saving} data-testid="save-customer-button"
                  className="h-12 px-6 text-lg font-bold bg-[#8C4A27] hover:bg-[#3B1E10] text-white w-full">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Customer"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-[#8C6D58]" />
        <Input
          data-testid="customer-search-input"
          placeholder="Search by ID (001), name, phone, or caretaker..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-14 pl-12 text-lg bg-white border-2 border-[#8C6D58] focus-visible:ring-4 focus-visible:ring-[#8C4A27]/30"
        />
      </div>

      {!customers ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8C4A27]" /></div>
      ) : customers.length === 0 ? (
        <Card className="p-12 text-center bg-white border-2 border-[#8C6D58]/30" data-testid="customers-empty">
          <Users className="w-12 h-12 mx-auto text-[#8C6D58] mb-3" />
          <p className="text-xl font-semibold text-[#24140E]">No customers {search ? "match your search" : "yet"}</p>
          {!search && <p className="text-[#5C4638] mt-1">Add your first customer to get started.</p>}
        </Card>
      ) : (
        <div className="grid gap-3" data-testid="customers-list">
          {customers.map((c) => (
            <Card
              key={c.id}
              data-testid={`customer-row-${c.customer_id}`}
              onClick={() => navigate(`/customers/${c.id}`)}
              className="p-4 sm:p-5 bg-white border-2 border-[#8C6D58]/30 hover:border-[#8C4A27] cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="font-mono font-bold text-xl text-[#8C4A27] bg-[#F4ECE1] rounded-lg px-3 py-2 min-w-[64px] text-center">
                  #{c.customer_id}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-heading text-xl font-semibold text-[#24140E] truncate">{c.full_name}</div>
                  <div className="text-sm text-[#5C4638]">
                    {c.phone || "No phone"} · Added {fmtDate(c.date_added)}
                    {c.caretakers?.length > 0 && ` · ${c.caretakers.length} caretaker(s)`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#5C4638] uppercase tracking-wide">Owed</div>
                  <div className={`font-mono font-bold text-lg ${c.balance > 0 ? "text-[#9A3412]" : "text-[#1E5E3A]"}`}>
                    {naira(c.balance)}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

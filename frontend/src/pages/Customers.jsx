import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErr, naira, fmtDate } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { BEANS_CLOSE } from "@/styles/imagery";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Search, UserPlus, Users, Loader2, Plus, Trash2, ChevronRight, X } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { full_name: "", phone: "", address: "", notes: "" };

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY);
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
      setForm(EMPTY);
      setCaretakers([]);
      load(search);
    } catch (e) {
      toast.error(apiErr(e));
    } finally {
      setSaving(false);
    }
  };

  const total = customers?.length;

  return (
    <div className="ce-page ce-stack">
      <PageHeader
        eyebrow="The customer book" image={BEANS_CLOSE}
        title="Customers"
        subtitle={`${total ?? "—"} account${total === 1 ? "" : "s"} in your ledger${search ? " matching your search" : ""} — debts, fertilizer and caretakers in one place.`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button data-testid="add-customer-button" className="ce-cta">
                <UserPlus /> Add customer
              </button>
            </DialogTrigger>
            <DialogContent className="ce-dialog max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="ce-dialog-title">New customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={submit}>
                <div className="ce-field">
                  <label>Full name *</label>
                  <input
                    data-testid="customer-name-input" required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="ce-input" placeholder="e.g. Adewale Ogunde"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                  <div className="ce-field">
                    <label>Phone</label>
                    <input
                      data-testid="customer-phone-input"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="ce-input" placeholder="080 0000 0000"
                    />
                  </div>
                  <div className="ce-field">
                    <label>Address</label>
                    <input
                      data-testid="customer-address-input"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className="ce-input" placeholder="Village / farm"
                    />
                  </div>
                </div>
                <div className="ce-field">
                  <label>Notes</label>
                  <textarea
                    data-testid="customer-notes-input" rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="ce-input" placeholder="Anything worth remembering"
                  />
                </div>

                <div className="ce-field">
                  <div className="flex items-center justify-between">
                    <label>Caretakers</label>
                    <button type="button" onClick={addCaretaker} data-testid="add-caretaker-button"
                      className="ce-cta pale sm">
                      <Plus /> Add
                    </button>
                  </div>
                  <div className="space-y-2 mt-2">
                    {caretakers.map((ct, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <input placeholder="Name" value={ct.name} data-testid={`caretaker-name-${i}`}
                          onChange={(e) => updateCaretaker(i, "name", e.target.value)}
                          className="ce-input" style={{ marginTop: 0 }} />
                        <input placeholder="Relationship" value={ct.relationship}
                          onChange={(e) => updateCaretaker(i, "relationship", e.target.value)}
                          className="ce-input" style={{ marginTop: 0 }} />
                        <button type="button" onClick={() => removeCaretaker(i)} aria-label="Remove caretaker"
                          className="ce-pen" style={{ background: "rgba(176,32,32,.14)", borderColor: "rgba(176,32,32,.4)", color: "#8F1D1D" }}>
                          <X />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <DialogFooter className="mt-4">
                  <button type="submit" disabled={saving} data-testid="save-customer-button"
                    className="ce-cta" style={{ width: "100%" }}>
                    {saving ? <Loader2 className="animate-spin" /> : "Save customer"}
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="ce-card ce-rise ce-d1" style={{ padding: 0 }}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A8451C]" />
          <input
            data-testid="customer-search-input"
            placeholder="Search by ID (001), name, phone, or caretaker…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ce-input"
            style={{ marginTop: 0, height: 62, border: "none", background: "transparent", boxShadow: "none", paddingLeft: 46, fontSize: 18 }}
          />
        </div>
      </div>

      {!customers ? (
        <div className="ce-spin"><Loader2 className="w-10 h-10 animate-spin" /></div>
      ) : customers.length === 0 ? (
        <div className="ce-empty" data-testid="customers-empty">
          <Users />
          <b>No customers {search ? "match your search" : "yet"}</b>
          {!search && <span>Add your first customer to open their ledger.</span>}
        </div>
      ) : (
        <div className="ce-list" data-testid="customers-list">
          {customers.map((c, i) => (
            <article
              key={c.id}
              data-testid={`customer-row-${c.customer_id}`}
              onClick={() => navigate(`/customers/${c.id}`)}
              className={`ce-row ce-rise ce-d${(i % 4) + 1}`}
            >
              <div className="ce-row-in">
                <div className="ce-id">#{c.customer_id}</div>
                <div className="flex-1 min-w-0">
                  <div className="ce-row-title truncate">{c.full_name}</div>
                  <div className="ce-row-meta">
                    {c.phone || "No phone"} · Added {fmtDate(c.date_added)}
                    {c.caretakers?.length > 0 && ` · ${c.caretakers.length} caretaker(s)`}
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="ce-label">Owed</div>
                  <div className={`ce-figure ${c.balance > 0 ? "rd" : "gr"}`} style={{ fontSize: 20, marginTop: 4 }}>
                    {naira(c.balance)}
                  </div>
                </div>
                <ChevronRight className="ce-chev" />
              </div>
            </article>
          ))}
        </div>
      )}

      <span className="ce-sr" data-testid="customer-total-count">{total ?? ""}</span>
    </div>
  );
}

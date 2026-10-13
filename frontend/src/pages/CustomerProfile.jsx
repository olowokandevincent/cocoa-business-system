import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiErr, naira, fmtDateTime, fmtDate } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { BEANS_CLOSE } from "@/styles/imagery";
import { Switch } from "@/components/ui/switch";
import { Calculator } from "@/components/Calculator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, Loader2, Phone, MapPin, Calendar, StickyNote, Users, Banknote, HandCoins,
  Lock, Unlock, Save, Trash2, Plus, TrendingDown, TrendingUp, Sprout, MessageSquare, UserPlus, Wallet,
} from "lucide-react";
import { toast } from "sonner";

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [c, setC] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [debtOpen, setDebtOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [debt, setDebt] = useState({ amount: "", reason: "" });
  const [pay, setPay] = useState({ amount: "", note: "" });
  const [fertOpen, setFertOpen] = useState(false);
  const [fert, setFert] = useState({ quantity: "", unit: "bags", note: "", value: "" });
  const [fertPayOpen, setFertPayOpen] = useState(false);
  const [fertPayTarget, setFertPayTarget] = useState(null);
  const [fertPay, setFertPay] = useState({ amount: "", note: "" });
  const [ctAddOpen, setCtAddOpen] = useState(false);
  const [newCt, setNewCt] = useState({ name: "", phone: "", relationship: "" });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/customers/${id}`);
      setC(data);
      setForm({ full_name: data.full_name, phone: data.phone, address: data.address, notes: data.notes });
    } catch (e) {
      toast.error(apiErr(e));
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const saveEdits = async () => {
    try {
      await api.patch(`/customers/${id}`, form);
      toast.success("Customer details saved");
      setEditing(false);
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const addDebt = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${id}/debts`, { amount: Number(debt.amount), reason: debt.reason });
      toast.success("Debt recorded");
      setDebtOpen(false);
      setDebt({ amount: "", reason: "" });
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const addPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${id}/repayments`, { amount: Number(pay.amount), note: pay.note });
      toast.success("Repayment recorded");
      setPayOpen(false);
      setPay({ amount: "", note: "" });
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const deleteCustomer = async () => {
    try {
      await api.delete(`/customers/${id}`);
      toast.success("Customer deleted");
      navigate("/customers");
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const addFertilizer = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${id}/fertilizer`, {
        quantity: Number(fert.quantity), unit: fert.unit, note: fert.note, value: Number(fert.value) || 0,
      });
      toast.success("Fertilizer collection recorded");
      setFertOpen(false);
      setFert({ quantity: "", unit: "bags", note: "", value: "" });
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const openFertPay = (f) => {
    setFertPayTarget(f);
    setFertPay({ amount: "", note: "" });
    setFertPayOpen(true);
  };

  const submitFertPay = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${id}/fertilizer/${fertPayTarget.id}/payments`, {
        amount: Number(fertPay.amount), note: fertPay.note,
      });
      toast.success("Fertilizer payment recorded");
      setFertPayOpen(false);
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const payFullFert = async () => {
    try {
      await api.post(`/customers/${id}/fertilizer/${fertPayTarget.id}/payments`, {
        amount: fertPayTarget.balance, note: "Full payment",
      });
      toast.success("Fertilizer marked as paid");
      setFertPayOpen(false);
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const addCaretaker = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${id}/caretakers`, newCt);
      toast.success("Caretaker added");
      setCtAddOpen(false);
      setNewCt({ name: "", phone: "", relationship: "" });
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  if (!c)
    return <div className="ce-spin"><Loader2 className="w-10 h-10 animate-spin" /></div>;

  const fertTotals = (c.fertilizer || []).reduce(
    (acc, f) => ({ value: acc.value + (f.value || 0), paid: acc.paid + (f.paid || 0), balance: acc.balance + (f.balance || 0) }),
    { value: 0, paid: 0, balance: 0 },
  );

  return (
    <div className="ce-page ce-stack">
      <button onClick={() => navigate("/customers")} data-testid="back-to-customers" className="ce-cta ghost sm"
        style={{ alignSelf: "flex-start" }}>
        <ArrowLeft /> Back to customers
      </button>

      <PageHeader
        eyebrow={`Customer #${c.customer_id}`} image={BEANS_CLOSE}
        title={c.full_name}
        subtitle={`Added ${fmtDate(c.date_added)} · Currently owing ${naira(c.balance)}`}
        actions={
          <span className="ce-feat">
            {editing ? <Unlock /> : <Lock />}
            {editing ? "Editing" : "Read-only"}
            <Switch checked={editing} onCheckedChange={setEditing} data-testid="edit-lock-switch" />
          </span>
        }
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 ce-stack">
          {/* Details */}
          <div className="ce-card ce-rise ce-d1">
            <span className="ce-sr" data-testid="customer-profile-name">{c.full_name}</span>
            <div className="ce-card-title">
              <Users style={{ color: "#A8451C" }} /> Details
            </div>

            <div className="grid sm:grid-cols-2 gap-5" style={{ marginTop: 16 }}>
              {editing ? (
                <>
                  <Field label="Full name">
                    <input value={form.full_name} data-testid="edit-name-input"
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="ce-input" />
                  </Field>
                  <Field label="Phone">
                    <input value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} className="ce-input" />
                  </Field>
                  <Field label="Address">
                    <input value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })} className="ce-input" />
                  </Field>
                  <Field label="Notes">
                    <textarea value={form.notes} rows={2}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })} className="ce-input" />
                  </Field>
                  <div className="sm:col-span-2">
                    <button onClick={saveEdits} data-testid="save-edits-button" className="ce-cta">
                      <Save /> Save changes
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <InfoRow icon={Phone} label="Phone" value={c.phone || "—"} />
                  <InfoRow icon={MapPin} label="Address" value={c.address || "—"} />
                  <InfoRow icon={Calendar} label="Date added" value={fmtDate(c.date_added)} />
                  <InfoRow icon={StickyNote} label="Notes" value={c.notes || "—"} />
                </>
              )}
            </div>
          </div>

          {/* Caretakers */}
          <div className="ce-card ce-rise ce-d2">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="ce-card-title"><Users style={{ color: "#A8451C" }} /> Caretakers</div>
              <Dialog open={ctAddOpen} onOpenChange={setCtAddOpen}>
                <DialogTrigger asChild>
                  <button data-testid="add-caretaker-button" className="ce-cta sm">
                    <UserPlus /> Add caretaker
                  </button>
                </DialogTrigger>
                <DialogContent className="ce-dialog">
                  <DialogHeader>
                    <DialogTitle className="ce-dialog-title">Add caretaker</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={addCaretaker}>
                    <Field label="Name *">
                      <input required value={newCt.name} data-testid="new-caretaker-name"
                        onChange={(e) => setNewCt({ ...newCt, name: e.target.value })} className="ce-input" />
                    </Field>
                    <div className="grid grid-cols-2 gap-x-3">
                      <Field label="Relationship">
                        <input value={newCt.relationship} data-testid="new-caretaker-relationship"
                          onChange={(e) => setNewCt({ ...newCt, relationship: e.target.value })} className="ce-input" />
                      </Field>
                      <Field label="Phone">
                        <input value={newCt.phone} data-testid="new-caretaker-phone"
                          onChange={(e) => setNewCt({ ...newCt, phone: e.target.value })} className="ce-input" />
                      </Field>
                    </div>
                    <DialogFooter className="mt-4">
                      <button type="submit" data-testid="save-new-caretaker" className="ce-cta" style={{ width: "100%" }}>
                        Add caretaker
                      </button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <p className="ce-note" style={{ marginTop: 8 }}>
              A caretaker's own money (cash they collected for personal use) is tracked separately from
              the customer's money below.
            </p>
            {c.caretakers?.length ? (
              <div className="grid sm:grid-cols-2 gap-4" style={{ marginTop: 16 }} data-testid="caretakers-list">
                {c.caretakers.map((ct, i) => (
                  <CaretakerCard key={ct.id || i} customerId={id} index={i} ct={ct} isAdmin={user?.role === "admin"} onDone={load} />
                ))}
              </div>
            ) : (
              <p className="ce-note" style={{ marginTop: 12 }}>No caretakers yet — add one above.</p>
            )}
          </div>

          {/* Fertilizer */}
          <div className="ce-card ce-rise ce-d3" data-testid="fertilizer-section">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="ce-card-title" style={{ color: "#1E5B38" }}>
                  <Sprout /> Fertilizer collected
                </div>
                <p className="ce-note" style={{ marginTop: 8 }}>
                  Separate from money owed — what the customer took, and how much of it they have paid.
                </p>
              </div>
              <Dialog open={fertOpen} onOpenChange={setFertOpen}>
                <DialogTrigger asChild>
                  <button data-testid="add-fertilizer-button" className="ce-cta leaf sm">
                    <Plus /> Add
                  </button>
                </DialogTrigger>
                <DialogContent className="ce-dialog">
                  <DialogHeader>
                    <DialogTitle className="ce-dialog-title" style={{ color: "#1E5B38" }}>
                      Record fertilizer collected
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={addFertilizer}>
                    <div className="grid grid-cols-2 gap-x-3">
                      <Field label="Quantity *">
                        <input type="number" step="0.1" required value={fert.quantity} data-testid="fertilizer-quantity-input"
                          onChange={(e) => setFert({ ...fert, quantity: e.target.value })} className="ce-input" />
                      </Field>
                      <Field label="Unit">
                        <input value={fert.unit} data-testid="fertilizer-unit-input"
                          onChange={(e) => setFert({ ...fert, unit: e.target.value })} className="ce-input" />
                      </Field>
                    </div>
                    <Field label="Value (₦, optional)">
                      <input type="number" step="0.01" value={fert.value} data-testid="fertilizer-value-input"
                        onChange={(e) => setFert({ ...fert, value: e.target.value })} className="ce-input" />
                    </Field>
                    <Field label="Note">
                      <input value={fert.note} data-testid="fertilizer-note-input"
                        placeholder="e.g. NPK 15-15-15, for main farm"
                        onChange={(e) => setFert({ ...fert, note: e.target.value })} className="ce-input" />
                    </Field>
                    <DialogFooter className="mt-4">
                      <button type="submit" data-testid="save-fertilizer-button" className="ce-cta leaf" style={{ width: "100%" }}>
                        Record
                      </button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {fertTotals.value > 0 && (
              <div className="ce-sub ce-sub-leaf" style={{ marginTop: 16 }} data-testid="fertilizer-totals">
                <div className="flex flex-wrap gap-x-8 gap-y-2">
                  <Total label="Total value" value={naira(fertTotals.value)} />
                  <Total label="Paid" value={naira(fertTotals.paid)} tone="gr" />
                  <Total label="Still owing" value={naira(fertTotals.balance)} tone={fertTotals.balance > 0 ? "rd" : "gr"}
                    testid="fertilizer-total-balance" />
                </div>
              </div>
            )}

            {c.fertilizer?.length ? (
              <div className="space-y-3" style={{ marginTop: 16 }} data-testid="fertilizer-list">
                {c.fertilizer.map((f) => (
                  <div key={f.id} className="ce-sub" data-testid={`fertilizer-record-${f.id}`}>
                    <div className="flex items-start gap-3">
                      <span className="ce-id" style={{ borderRadius: 13, minWidth: 46, color: "#1E5B38", background: "linear-gradient(180deg,#E6F3E9,#CFE6D6)" }}>
                        <Sprout style={{ width: 20, height: 20 }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div style={{ fontWeight: 700, color: "#2B1A0F" }}>
                          {f.quantity} {f.unit} {f.note ? `— ${f.note}` : ""}
                        </div>
                        <div className="ce-note" style={{ fontSize: 13 }}>{fmtDateTime(f.date)} · {f.by}</div>
                      </div>
                      <FertilizerStatusBadge status={f.payment_status} />
                    </div>

                    {f.value > 0 && (
                      <>
                        <div className="grid grid-cols-3 gap-2" style={{ marginTop: 12 }}>
                          <Mini label="Value" value={naira(f.value)} />
                          <Mini label="Paid" value={naira(f.paid)} tone="gr" testid={`fertilizer-paid-${f.id}`} />
                          <Mini label="Balance" value={naira(f.balance)} tone={f.balance > 0 ? "rd" : "gr"}
                            testid={`fertilizer-balance-${f.id}`} />
                        </div>

                        {f.payments?.length > 0 && (
                          <div className="space-y-1" style={{ marginTop: 10, maxHeight: 120, overflowY: "auto" }}
                            data-testid={`fertilizer-payments-${f.id}`}>
                            {f.payments.map((p) => (
                              <div key={p.id} className="flex items-center justify-between gap-2" style={{ fontSize: 13.5 }}>
                                <span className="ce-note truncate">
                                  Paid{p.note ? ` · ${p.note}` : ""} · {fmtDateTime(p.date)}
                                </span>
                                <span className="ce-figure gr" style={{ fontSize: 14 }}>−{naira(p.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {f.balance > 0 && (
                          <button onClick={() => openFertPay(f)} data-testid={`fertilizer-pay-${f.id}`}
                            className="ce-cta leaf sm" style={{ marginTop: 12 }}>
                            <HandCoins /> Record payment
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="ce-note" style={{ marginTop: 12 }}>No fertilizer collected yet.</p>
            )}

            <Dialog open={fertPayOpen} onOpenChange={setFertPayOpen}>
              <DialogContent className="ce-dialog">
                <DialogHeader>
                  <DialogTitle className="ce-dialog-title" style={{ color: "#1E5B38" }}>
                    Record fertilizer payment
                  </DialogTitle>
                </DialogHeader>
                {fertPayTarget && (
                  <form onSubmit={submitFertPay}>
                    <div className="ce-mini">
                      <div className="ce-note">
                        {fertPayTarget.quantity} {fertPayTarget.unit}{fertPayTarget.note ? ` — ${fertPayTarget.note}` : ""}
                      </div>
                      <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
                        <span className="ce-note">Balance owing</span>
                        <span className="ce-figure rd" style={{ fontSize: 18 }} data-testid="fert-pay-balance">
                          {naira(fertPayTarget.balance)}
                        </span>
                      </div>
                    </div>
                    <Field label="Amount paid (₦) *">
                      <input type="number" step="0.01" min="0" required value={fertPay.amount} data-testid="fert-pay-amount"
                        onChange={(e) => setFertPay({ ...fertPay, amount: e.target.value })} className="ce-input" />
                    </Field>
                    <Field label="Note">
                      <input value={fertPay.note} data-testid="fert-pay-note" placeholder="e.g. part payment"
                        onChange={(e) => setFertPay({ ...fertPay, note: e.target.value })} className="ce-input" />
                    </Field>
                    <DialogFooter className="mt-4">
                      <button type="button" onClick={payFullFert} data-testid="fert-pay-full" className="ce-cta pale sm">
                        Pay full balance
                      </button>
                      <button type="submit" data-testid="fert-pay-save" className="ce-cta leaf sm">
                        Record payment
                      </button>
                    </DialogFooter>
                  </form>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {/* Money owed */}
          <div className="ce-card ce-rise ce-d4">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              <div>
                <div className="ce-label">Current owing (money)</div>
                <div className={`ce-figure ${c.balance > 0 ? "rd" : "gr"}`} style={{ fontSize: 42, marginTop: 6 }}
                  data-testid="customer-balance">
                  {naira(c.balance)}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
                  <DialogTrigger asChild>
                    <button data-testid="add-debt-button" className="ce-cta rust sm">
                      <TrendingUp /> Add debt
                    </button>
                  </DialogTrigger>
                  <DialogContent className="ce-dialog">
                    <DialogHeader>
                      <DialogTitle className="ce-dialog-title">Record money owed</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addDebt}>
                      <Field label="Amount (₦) *">
                        <input type="number" step="0.01" required value={debt.amount} data-testid="debt-amount-input"
                          onChange={(e) => setDebt({ ...debt, amount: e.target.value })} className="ce-input" />
                      </Field>
                      <Field label="Reason *">
                        <input required value={debt.reason} data-testid="debt-reason-input"
                          placeholder="e.g. Fertilizer advance"
                          onChange={(e) => setDebt({ ...debt, reason: e.target.value })} className="ce-input" />
                      </Field>
                      <DialogFooter className="mt-4">
                        <button type="submit" data-testid="save-debt-button" className="ce-cta rust" style={{ width: "100%" }}>
                          Record debt
                        </button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={payOpen} onOpenChange={setPayOpen}>
                  <DialogTrigger asChild>
                    <button data-testid="add-payment-button" className="ce-cta leaf sm">
                      <TrendingDown /> Repayment
                    </button>
                  </DialogTrigger>
                  <DialogContent className="ce-dialog">
                    <DialogHeader>
                      <DialogTitle className="ce-dialog-title">Record repayment</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addPayment}>
                      <Field label="Amount (₦) *">
                        <input type="number" step="0.01" required value={pay.amount} data-testid="payment-amount-input"
                          onChange={(e) => setPay({ ...pay, amount: e.target.value })} className="ce-input" />
                      </Field>
                      <Field label="Note">
                        <input value={pay.note} data-testid="payment-note-input" placeholder="e.g. Cash payment"
                          onChange={(e) => setPay({ ...pay, note: e.target.value })} className="ce-input" />
                      </Field>
                      <DialogFooter className="mt-4">
                        <button type="submit" data-testid="save-payment-button" className="ce-cta leaf" style={{ width: "100%" }}>
                          Record repayment
                        </button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <hr className="ce-hairline" style={{ margin: "20px 0 16px" }} />

            <div className="ce-label">Owing history</div>
            {c.history?.length ? (
              <div className="space-y-2" style={{ marginTop: 12 }} data-testid="customer-history">
                {c.history.map((h, i) => (
                  <div key={i} className="ce-mini flex items-center gap-3">
                    <span className="ce-id" style={{ minWidth: 44, borderRadius: 12, padding: "7px 0", color: h.type === "debt" ? "#8F1D1D" : "#1E5B38" }}>
                      {h.type === "debt" ? <Banknote style={{ width: 19, height: 19 }} /> : <HandCoins style={{ width: 19, height: 19 }} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div style={{ fontWeight: 700, color: "#2B1A0F" }}>
                        {h.type === "debt" ? "Debt" : "Repayment"} — {h.reason || h.note || "—"}
                      </div>
                      <div className="ce-note" style={{ fontSize: 13 }}>{fmtDateTime(h.date)} · by {h.by || "—"}</div>
                    </div>
                    <div className={`ce-figure ${h.type === "debt" ? "rd" : "gr"}`} style={{ fontSize: 18 }}>
                      {h.type === "debt" ? "+" : "−"}{naira(h.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ce-note" style={{ marginTop: 12 }}>No debt or repayment records yet.</p>
            )}
          </div>

          {user?.role === "admin" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button data-testid="delete-customer-button" className="ce-cta ghost sm" style={{ alignSelf: "flex-start" }}>
                  <Trash2 /> Delete customer (owner only)
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent className="ce-dialog">
                <AlertDialogHeader>
                  <AlertDialogTitle className="ce-dialog-title" style={{ color: "#8F1D1D" }}>
                    Delete this customer?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="ce-note">
                    This permanently removes #{c.customer_id} {c.full_name} and all their debt &amp;
                    repayment history. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="ce-pill">Cancel</AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <button onClick={deleteCustomer} data-testid="confirm-delete-customer" className="ce-cta rust sm">
                      Yes, delete
                    </button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="ce-stack">
          <Calculator title="Debt & bag calculator" />
        </div>
      </div>
    </div>
  );
}

function CaretakerCard({ customerId, index, ct, isAdmin, onDone }) {
  const [note, setNote] = useState("");
  const [debtOpen, setDebtOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [debt, setDebt] = useState({ amount: "", reason: "" });
  const [pay, setPay] = useState({ amount: "", note: "" });

  const addNote = async () => {
    if (!note.trim()) return;
    try {
      await api.post(`/customers/${customerId}/caretakers/${index}/records`, { note: note.trim() });
      setNote("");
      onDone();
    } catch (e) { toast.error(apiErr(e)); }
  };
  const addDebt = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${customerId}/caretakers/${index}/debts`, { amount: Number(debt.amount), reason: debt.reason });
      toast.success("Caretaker's money recorded");
      setDebtOpen(false); setDebt({ amount: "", reason: "" }); onDone();
    } catch (e) { toast.error(apiErr(e)); }
  };
  const addPay = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/customers/${customerId}/caretakers/${index}/repayments`, { amount: Number(pay.amount), note: pay.note });
      toast.success("Caretaker repayment recorded");
      setPayOpen(false); setPay({ amount: "", note: "" }); onDone();
    } catch (e) { toast.error(apiErr(e)); }
  };
  const remove = async () => {
    try { await api.delete(`/customers/${customerId}/caretakers/${index}`); toast.success("Caretaker removed"); onDone(); }
    catch (e) { toast.error(apiErr(e)); }
  };

  const bal = ct.balance || 0;

  return (
    <div className="ce-sub" data-testid={`caretaker-card-${index}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div style={{ fontWeight: 700, fontSize: 17, color: "#2B1A0F" }} className="truncate">{ct.name}</div>
          <div className="ce-note" style={{ fontSize: 13 }}>
            {ct.relationship || "Caretaker"}{ct.phone ? ` · ${ct.phone}` : ""}
          </div>
        </div>
        {isAdmin && (
          <button onClick={remove} data-testid={`remove-caretaker-${index}`} aria-label={`Remove ${ct.name}`}
            className="ce-pen" style={{ background: "rgba(176,32,32,.12)", borderColor: "rgba(176,32,32,.35)", color: "#8F1D1D" }}>
            <Trash2 />
          </button>
        )}
      </div>

      {/* Caretaker's own money */}
      <div className="ce-mini" style={{ marginTop: 12 }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="ce-label" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Wallet style={{ width: 14, height: 14 }} /> Caretaker's own money
            </div>
            <div className={`ce-figure ${bal > 0 ? "rd" : "gr"}`} style={{ fontSize: 22, marginTop: 4 }}
              data-testid={`caretaker-balance-${index}`}>
              {naira(bal)}
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
              <DialogTrigger asChild>
                <button data-testid={`caretaker-add-debt-${index}`} className="ce-cta rust sm">Debt</button>
              </DialogTrigger>
              <DialogContent className="ce-dialog">
                <DialogHeader>
                  <DialogTitle className="ce-dialog-title">Money collected by {ct.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={addDebt}>
                  <Field label="Amount (₦) *">
                    <input type="number" step="0.01" required value={debt.amount} data-testid={`caretaker-debt-amount-${index}`}
                      onChange={(e) => setDebt({ ...debt, amount: e.target.value })} className="ce-input" />
                  </Field>
                  <Field label="Reason *">
                    <input required value={debt.reason} data-testid={`caretaker-debt-reason-${index}`}
                      placeholder="e.g. Personal cash advance"
                      onChange={(e) => setDebt({ ...debt, reason: e.target.value })} className="ce-input" />
                  </Field>
                  <DialogFooter className="mt-4">
                    <button type="submit" data-testid={`caretaker-save-debt-${index}`} className="ce-cta rust" style={{ width: "100%" }}>
                      Record
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild>
                <button data-testid={`caretaker-add-payment-${index}`} className="ce-cta leaf sm">Repay</button>
              </DialogTrigger>
              <DialogContent className="ce-dialog">
                <DialogHeader>
                  <DialogTitle className="ce-dialog-title">Repayment by {ct.name}</DialogTitle>
                </DialogHeader>
                <form onSubmit={addPay}>
                  <Field label="Amount (₦) *">
                    <input type="number" step="0.01" required value={pay.amount} data-testid={`caretaker-payment-amount-${index}`}
                      onChange={(e) => setPay({ ...pay, amount: e.target.value })} className="ce-input" />
                  </Field>
                  <Field label="Note">
                    <input value={pay.note} data-testid={`caretaker-payment-note-${index}`}
                      onChange={(e) => setPay({ ...pay, note: e.target.value })} className="ce-input" />
                  </Field>
                  <DialogFooter className="mt-4">
                    <button type="submit" data-testid={`caretaker-save-payment-${index}`} className="ce-cta leaf" style={{ width: "100%" }}>
                      Record
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {ct.money_history?.length > 0 && (
          <div className="space-y-1" style={{ marginTop: 10, maxHeight: 120, overflowY: "auto" }}
            data-testid={`caretaker-money-history-${index}`}>
            {ct.money_history.map((h, hi) => (
              <div key={hi} className="flex items-center justify-between gap-2" style={{ fontSize: 13.5 }}>
                <span className="ce-note truncate">
                  {h.type === "debt" ? "Took" : "Repaid"}: {h.reason || h.note || "—"}
                </span>
                <span className={`ce-figure ${h.type === "debt" ? "rd" : "gr"}`} style={{ fontSize: 14 }}>
                  {h.type === "debt" ? "+" : "−"}{naira(h.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Short notes */}
      <div style={{ marginTop: 12 }}>
        <div className="ce-label" style={{ display: "flex", alignItems: "center", gap: 5, color: "#A8451C" }}>
          <MessageSquare style={{ width: 14, height: 14 }} /> Short record
        </div>
        {ct.records?.length ? (
          <div className="space-y-1.5" style={{ margin: "8px 0", maxHeight: 120, overflowY: "auto" }}
            data-testid={`caretaker-records-${index}`}>
            {ct.records.map((r, ri) => (
              <div key={ri} className="ce-mini" style={{ padding: "7px 10px" }}>
                <div style={{ fontSize: 14.5, color: "#2B1A0F" }}>{r.note}</div>
                <div className="ce-note" style={{ fontSize: 12 }}>{fmtDateTime(r.date)} · {r.by}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ce-note" style={{ margin: "8px 0", fontStyle: "italic" }}>No notes yet.</div>
        )}
        <div className="flex gap-2">
          <input value={note} data-testid={`caretaker-record-input-${index}`}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNote())}
            placeholder="Add a short note…" className="ce-input" style={{ marginTop: 0, height: 44, fontSize: 15 }} />
          <button type="button" onClick={addNote} data-testid={`add-caretaker-record-${index}`}
            aria-label="Add note" className="ce-cta sm" style={{ padding: "0 14px" }}>
            <Plus />
          </button>
        </div>
      </div>
    </div>
  );
}

function FertilizerStatusBadge({ status }) {
  if (!status || status === "no_charge") return null;
  const labels = { paid: "Paid", partial: "Part-paid", unpaid: "Unpaid" };
  return (
    <span className={`ce-tag ${status}`} data-testid={`fert-status-${status}`}>
      {labels[status]}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div className="ce-field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <span className="ce-id" style={{ minWidth: 40, padding: "8px 0", borderRadius: 12 }}>
        <Icon style={{ width: 19, height: 19 }} />
      </span>
      <div className="min-w-0">
        <div className="ce-label">{label}</div>
        <div style={{ fontSize: 17, color: "#2B1A0F", fontWeight: 500, marginTop: 3, wordBreak: "break-word" }}>{value}</div>
      </div>
    </div>
  );
}

function Mini({ label, value, tone, testid }) {
  return (
    <div className="ce-mini" style={{ textAlign: "center" }}>
      <div className="ce-label">{label}</div>
      <div className={`ce-figure ${tone || ""}`} style={{ fontSize: 17, marginTop: 3 }} data-testid={testid}>{value}</div>
    </div>
  );
}

function Total({ label, value, tone, testid }) {
  return (
    <div>
      <div className="ce-label">{label}</div>
      <div className={`ce-figure ${tone || ""}`} style={{ fontSize: 19, marginTop: 3 }} data-testid={testid}>{value}</div>
    </div>
  );
}

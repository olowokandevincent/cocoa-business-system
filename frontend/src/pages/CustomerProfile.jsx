import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, apiErr, naira, fmtDateTime, fmtDate } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
    return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8C4A27]" /></div>;

  return (
    <div className="animate-fade-up">
      <button onClick={() => navigate("/customers")} data-testid="back-to-customers"
        className="flex items-center gap-2 text-[#5C4638] hover:text-[#8C4A27] font-semibold mb-4">
        <ArrowLeft className="w-5 h-5" /> Back to customers
      </button>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <Card className="p-6 bg-white border-2 border-[#8C6D58]/30">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="font-mono font-bold text-2xl text-[#8C4A27] bg-[#F4ECE1] rounded-xl px-4 py-3">
                  #{c.customer_id}
                </div>
                <div>
                  <h1 className="font-heading text-3xl font-bold text-[#24140E]" data-testid="customer-profile-name">
                    {c.full_name}
                  </h1>
                  <div className="text-[#5C4638]">Added {fmtDate(c.date_added)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-[#F4ECE1] px-3 py-2 rounded-lg border-2 border-[#8C6D58]/40">
                {editing ? <Unlock className="w-5 h-5 text-[#1E5E3A]" /> : <Lock className="w-5 h-5 text-[#5C4638]" />}
                <span className="text-sm font-semibold text-[#24140E] hidden sm:inline">
                  {editing ? "Editing" : "Read-only"}
                </span>
                <Switch checked={editing} onCheckedChange={setEditing} data-testid="edit-lock-switch" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              {editing ? (
                <>
                  <Field label="Full name"><Input value={form.full_name} data-testid="edit-name-input"
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="bg-white border-2 border-[#8C6D58] h-11" /></Field>
                  <Field label="Phone"><Input value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="bg-white border-2 border-[#8C6D58] h-11" /></Field>
                  <Field label="Address"><Input value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="bg-white border-2 border-[#8C6D58] h-11" /></Field>
                  <Field label="Notes"><Textarea value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="bg-white border-2 border-[#8C6D58]" /></Field>
                  <div className="sm:col-span-2">
                    <Button onClick={saveEdits} data-testid="save-edits-button"
                      className="h-11 bg-[#8C4A27] hover:bg-[#3B1E10] text-white font-bold">
                      <Save className="w-4 h-4 mr-2" /> Save changes
                    </Button>
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
          </Card>

          {/* Caretakers */}
          <Card className="p-6 bg-white border-2 border-[#8C6D58]/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold text-[#3B1E10] flex items-center gap-2">
                <Users className="w-6 h-6" /> Caretakers
              </h2>
              <Dialog open={ctAddOpen} onOpenChange={setCtAddOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-caretaker-button" className="h-11 bg-[#8C4A27] hover:bg-[#3B1E10] text-white font-bold">
                    <UserPlus className="w-4 h-4 mr-1" /> Add Caretaker
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#FAF5EF]">
                  <DialogHeader><DialogTitle className="font-heading text-2xl text-[#3B1E10]">Add Caretaker</DialogTitle></DialogHeader>
                  <form onSubmit={addCaretaker} className="space-y-4">
                    <Field label="Name *"><Input required value={newCt.name} data-testid="new-caretaker-name"
                      onChange={(e) => setNewCt({ ...newCt, name: e.target.value })}
                      className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Relationship"><Input value={newCt.relationship} data-testid="new-caretaker-relationship"
                        onChange={(e) => setNewCt({ ...newCt, relationship: e.target.value })}
                        className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                      <Field label="Phone"><Input value={newCt.phone} data-testid="new-caretaker-phone"
                        onChange={(e) => setNewCt({ ...newCt, phone: e.target.value })}
                        className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                    </div>
                    <DialogFooter>
                      <Button type="submit" data-testid="save-new-caretaker"
                        className="w-full h-12 bg-[#8C4A27] hover:bg-[#3B1E10] text-white font-bold">Add Caretaker</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm text-[#5C4638] mb-4 -mt-2">
              A caretaker's own money (cash they collected for personal use) is tracked separately from the customer's money below.
            </p>
            {c.caretakers?.length ? (
              <div className="grid sm:grid-cols-2 gap-4" data-testid="caretakers-list">
                {c.caretakers.map((ct, i) => (
                  <CaretakerCard key={ct.id || i} customerId={id} index={i} ct={ct} isAdmin={user?.role === "admin"} onDone={load} />
                ))}
              </div>
            ) : (
              <p className="text-[#5C4638]">No caretakers yet. Add one above.</p>
            )}
          </Card>

          {/* Fertilizer feed */}
          <Card className="p-6 bg-white border-2 border-[#8C6D58]/30" data-testid="fertilizer-section">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-2xl font-bold text-[#1E5E3A] flex items-center gap-2">
                  <Sprout className="w-6 h-6" /> Fertilizer Collected
                </h2>
                <p className="text-sm text-[#5C4638] mt-1">Separate from money owed — tracks fertilizer the customer took.</p>
              </div>
              <Dialog open={fertOpen} onOpenChange={setFertOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-fertilizer-button" className="h-11 bg-[#1E5E3A] hover:bg-[#164a2d] text-white font-bold">
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#FAF5EF]">
                  <DialogHeader><DialogTitle className="font-heading text-2xl text-[#1E5E3A]">Record Fertilizer Collected</DialogTitle></DialogHeader>
                  <form onSubmit={addFertilizer} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Quantity *"><Input type="number" step="0.1" required value={fert.quantity}
                        data-testid="fertilizer-quantity-input" onChange={(e) => setFert({ ...fert, quantity: e.target.value })}
                        className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                      <Field label="Unit"><Input value={fert.unit} data-testid="fertilizer-unit-input"
                        onChange={(e) => setFert({ ...fert, unit: e.target.value })}
                        className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                    </div>
                    <Field label="Value (₦, optional)"><Input type="number" step="0.01" value={fert.value}
                      data-testid="fertilizer-value-input" onChange={(e) => setFert({ ...fert, value: e.target.value })}
                      className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                    <Field label="Note"><Input value={fert.note} data-testid="fertilizer-note-input"
                      placeholder="e.g. NPK 15-15-15, for main farm" onChange={(e) => setFert({ ...fert, note: e.target.value })}
                      className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                    <DialogFooter>
                      <Button type="submit" data-testid="save-fertilizer-button"
                        className="w-full h-12 bg-[#1E5E3A] hover:bg-[#164a2d] text-white font-bold">Record</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            {c.fertilizer?.length ? (
              <div className="space-y-2" data-testid="fertilizer-list">
                {c.fertilizer.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border bg-[#F4ECE1] border-[#E3D5C5]">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1E5E3A]">
                      <Sprout className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#24140E]">
                        {f.quantity} {f.unit} {f.note ? `— ${f.note}` : ""}
                        {f.value ? <span className="text-[#5C4638] font-normal"> ({naira(f.value)})</span> : null}
                      </div>
                      <div className="text-sm text-[#5C4638]">{fmtDateTime(f.date)} · {f.by}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#5C4638]">No fertilizer collected yet.</p>
            )}
          </Card>

          {/* Debt & repayment actions */}
          <Card className="p-6 bg-white border-2 border-[#8C6D58]/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-base font-semibold text-[#5C4638]">Current Owing (money)</div>
                <div className={`font-mono font-bold text-4xl ${c.balance > 0 ? "text-[#9A3412]" : "text-[#1E5E3A]"}`}
                  data-testid="customer-balance">{naira(c.balance)}</div>
              </div>
              <div className="flex gap-2">
                <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-debt-button"
                      className="h-11 bg-[#9A3412] hover:bg-[#7c2d12] text-white font-bold">
                      <TrendingUp className="w-4 h-4 mr-1" /> Add Debt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#FAF5EF]">
                    <DialogHeader><DialogTitle className="font-heading text-2xl text-[#3B1E10]">Record Money Owed</DialogTitle></DialogHeader>
                    <form onSubmit={addDebt} className="space-y-4">
                      <Field label="Amount (₦) *"><Input type="number" step="0.01" required value={debt.amount}
                        data-testid="debt-amount-input" onChange={(e) => setDebt({ ...debt, amount: e.target.value })}
                        className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                      <Field label="Reason *"><Input required value={debt.reason} data-testid="debt-reason-input"
                        placeholder="e.g. Fertilizer advance" onChange={(e) => setDebt({ ...debt, reason: e.target.value })}
                        className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                      <DialogFooter>
                        <Button type="submit" data-testid="save-debt-button"
                          className="w-full h-12 bg-[#9A3412] hover:bg-[#7c2d12] text-white font-bold">Record Debt</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={payOpen} onOpenChange={setPayOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-payment-button"
                      className="h-11 bg-[#1E5E3A] hover:bg-[#164a2d] text-white font-bold">
                      <TrendingDown className="w-4 h-4 mr-1" /> Repayment
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#FAF5EF]">
                    <DialogHeader><DialogTitle className="font-heading text-2xl text-[#3B1E10]">Record Repayment</DialogTitle></DialogHeader>
                    <form onSubmit={addPayment} className="space-y-4">
                      <Field label="Amount (₦) *"><Input type="number" step="0.01" required value={pay.amount}
                        data-testid="payment-amount-input" onChange={(e) => setPay({ ...pay, amount: e.target.value })}
                        className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                      <Field label="Note"><Input value={pay.note} data-testid="payment-note-input"
                        placeholder="e.g. Cash payment" onChange={(e) => setPay({ ...pay, note: e.target.value })}
                        className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                      <DialogFooter>
                        <Button type="submit" data-testid="save-payment-button"
                          className="w-full h-12 bg-[#1E5E3A] hover:bg-[#164a2d] text-white font-bold">Record Repayment</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* History */}
            <h3 className="font-heading text-xl font-semibold text-[#3B1E10] mt-2 mb-3">Owing History</h3>
            {c.history?.length ? (
              <div className="space-y-2" data-testid="customer-history">
                {c.history.map((h, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[#F4ECE1] border border-[#E3D5C5]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      h.type === "debt" ? "bg-[#9A3412]" : "bg-[#1E5E3A]"}`}>
                      {h.type === "debt" ? <Banknote className="w-5 h-5 text-white" /> : <HandCoins className="w-5 h-5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[#24140E]">
                        {h.type === "debt" ? "Debt" : "Repayment"} — {h.reason || h.note || "—"}
                      </div>
                      <div className="text-sm text-[#5C4638]">{fmtDateTime(h.date)} · by {h.by || "—"}</div>
                    </div>
                    <div className={`font-mono font-bold text-lg ${h.type === "debt" ? "text-[#9A3412]" : "text-[#1E5E3A]"}`}>
                      {h.type === "debt" ? "+" : "−"}{naira(h.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#5C4638]">No debt or repayment records yet.</p>
            )}
          </Card>

          {user?.role === "admin" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" data-testid="delete-customer-button"
                  className="border-2 border-[#991B1B] text-[#991B1B] hover:bg-[#FEF2F2] font-semibold h-11">
                  <Trash2 className="w-4 h-4 mr-2" /> Delete customer (owner only)
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#FAF5EF]">
                <AlertDialogHeader>
                  <AlertDialogTitle className="font-heading text-2xl text-[#991B1B]">Delete this customer?</AlertDialogTitle>
                  <AlertDialogDescription className="text-base text-[#5C4638]">
                    This permanently removes #{c.customer_id} {c.full_name} and all their debt & repayment history. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteCustomer} data-testid="confirm-delete-customer"
                    className="h-11 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold">Yes, delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <div className="space-y-6">
          <Calculator title="Debt & Bag Calculator" />
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
    <div className="bg-[#F4ECE1] rounded-xl p-4 border border-[#E3D5C5]" data-testid={`caretaker-card-${index}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="font-semibold text-lg text-[#24140E] truncate">{ct.name}</div>
          <div className="text-sm text-[#5C4638]">{ct.relationship || "Caretaker"}{ct.phone ? ` · ${ct.phone}` : ""}</div>
        </div>
        {isAdmin && (
          <button onClick={remove} data-testid={`remove-caretaker-${index}`} className="text-[#991B1B] p-1.5 hover:bg-white rounded-lg shrink-0">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Caretaker's own money */}
      <div className="mt-3 bg-white rounded-lg p-3 border border-[#E3D5C5]">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wide text-[#5C4638] flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Caretaker's own money</div>
            <div className={`font-mono font-bold text-xl ${bal > 0 ? "text-[#9A3412]" : "text-[#1E5E3A]"}`} data-testid={`caretaker-balance-${index}`}>{naira(bal)}</div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Dialog open={debtOpen} onOpenChange={setDebtOpen}>
              <DialogTrigger asChild>
                <Button data-testid={`caretaker-add-debt-${index}`} className="h-9 px-3 bg-[#9A3412] hover:bg-[#7c2d12] text-white text-sm font-bold">Debt</Button>
              </DialogTrigger>
              <DialogContent className="bg-[#FAF5EF]">
                <DialogHeader><DialogTitle className="font-heading text-xl text-[#3B1E10]">Money collected by {ct.name}</DialogTitle></DialogHeader>
                <form onSubmit={addDebt} className="space-y-3">
                  <Field label="Amount (₦) *"><Input type="number" step="0.01" required value={debt.amount} data-testid={`caretaker-debt-amount-${index}`}
                    onChange={(e) => setDebt({ ...debt, amount: e.target.value })} className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                  <Field label="Reason *"><Input required value={debt.reason} data-testid={`caretaker-debt-reason-${index}`}
                    placeholder="e.g. Personal cash advance" onChange={(e) => setDebt({ ...debt, reason: e.target.value })} className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                  <DialogFooter><Button type="submit" data-testid={`caretaker-save-debt-${index}`} className="w-full h-12 bg-[#9A3412] hover:bg-[#7c2d12] text-white font-bold">Record</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={payOpen} onOpenChange={setPayOpen}>
              <DialogTrigger asChild>
                <Button data-testid={`caretaker-add-payment-${index}`} className="h-9 px-3 bg-[#1E5E3A] hover:bg-[#164a2d] text-white text-sm font-bold">Repay</Button>
              </DialogTrigger>
              <DialogContent className="bg-[#FAF5EF]">
                <DialogHeader><DialogTitle className="font-heading text-xl text-[#3B1E10]">Repayment by {ct.name}</DialogTitle></DialogHeader>
                <form onSubmit={addPay} className="space-y-3">
                  <Field label="Amount (₦) *"><Input type="number" step="0.01" required value={pay.amount} data-testid={`caretaker-payment-amount-${index}`}
                    onChange={(e) => setPay({ ...pay, amount: e.target.value })} className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                  <Field label="Note"><Input value={pay.note} data-testid={`caretaker-payment-note-${index}`}
                    onChange={(e) => setPay({ ...pay, note: e.target.value })} className="bg-white border-2 border-[#8C6D58] h-12 text-lg" /></Field>
                  <DialogFooter><Button type="submit" data-testid={`caretaker-save-payment-${index}`} className="w-full h-12 bg-[#1E5E3A] hover:bg-[#164a2d] text-white font-bold">Record</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {ct.money_history?.length > 0 && (
          <div className="mt-2 space-y-1 max-h-28 overflow-y-auto" data-testid={`caretaker-money-history-${index}`}>
            {ct.money_history.map((h, hi) => (
              <div key={hi} className="flex items-center justify-between text-sm gap-2">
                <span className="text-[#5C4638] truncate">{h.type === "debt" ? "Took" : "Repaid"}: {h.reason || h.note || "—"}</span>
                <span className={`font-mono font-bold shrink-0 ${h.type === "debt" ? "text-[#9A3412]" : "text-[#1E5E3A]"}`}>{h.type === "debt" ? "+" : "−"}{naira(h.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Short record notes */}
      <div className="mt-3">
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#8C4A27] mb-2"><MessageSquare className="w-3.5 h-3.5" /> Short record</div>
        {ct.records?.length ? (
          <div className="space-y-1.5 mb-2 max-h-28 overflow-y-auto" data-testid={`caretaker-records-${index}`}>
            {ct.records.map((r, ri) => (
              <div key={ri} className="bg-white rounded-lg px-3 py-1.5 border border-[#E3D5C5]">
                <div className="text-sm text-[#24140E]">{r.note}</div>
                <div className="text-xs text-[#5C4638]">{fmtDateTime(r.date)} · {r.by}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-[#5C4638] mb-2 italic">No notes yet.</div>
        )}
        <div className="flex gap-2">
          <Input value={note} data-testid={`caretaker-record-input-${index}`}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addNote())}
            placeholder="Add a short note..." className="h-10 bg-white border border-[#8C6D58] text-sm" />
          <Button type="button" onClick={addNote} data-testid={`add-caretaker-record-${index}`}
            className="h-10 px-3 bg-[#8C4A27] hover:bg-[#3B1E10] text-white shrink-0"><Plus className="w-4 h-4" /></Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <Label className="text-base font-semibold text-[#24140E]">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-5 h-5 text-[#8C4A27] mt-1 shrink-0" />
      <div>
        <div className="text-sm text-[#5C4638] uppercase tracking-wide">{label}</div>
        <div className="text-lg text-[#24140E] font-medium break-words">{value}</div>
      </div>
    </div>
  );
}
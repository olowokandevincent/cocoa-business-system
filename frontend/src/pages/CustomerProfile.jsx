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
  Lock, Unlock, Save, Trash2, Plus, TrendingDown, TrendingUp,
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
            <h2 className="font-heading text-2xl font-bold text-[#3B1E10] flex items-center gap-2 mb-4">
              <Users className="w-6 h-6" /> Caretakers
            </h2>
            {c.caretakers?.length ? (
              <div className="grid sm:grid-cols-2 gap-3" data-testid="caretakers-list">
                {c.caretakers.map((ct, i) => (
                  <div key={i} className="bg-[#F4ECE1] rounded-lg p-3 border border-[#E3D5C5]">
                    <div className="font-semibold text-[#24140E]">{ct.name}</div>
                    <div className="text-sm text-[#5C4638]">
                      {ct.relationship || "Caretaker"}{ct.phone ? ` · ${ct.phone}` : ""}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#5C4638]">No caretakers recorded.</p>
            )}
          </Card>

          {/* Debt & repayment actions */}
          <Card className="p-6 bg-white border-2 border-[#8C6D58]/30">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-base font-semibold text-[#5C4638]">Total money owed</div>
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
            <h3 className="font-heading text-xl font-semibold text-[#3B1E10] mt-2 mb-3">Full History</h3>
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

import { useEffect, useState } from "react";
import { api, apiErr, fmtDate } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ESTATE } from "@/styles/imagery";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Loader2, Trash2, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

export default function Staff() {
  const [staff, setStaff] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const load = async () => {
    try {
      const { data } = await api.get("/staff");
      setStaff(data);
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    try {
      await api.post("/staff", form);
      toast.success("Staff account created");
      setOpen(false);
      setForm({ name: "", email: "", password: "" });
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const toggleActive = async (s) => {
    try {
      await api.patch(`/staff/${s.id}`, { active: !s.active });
      toast.success(s.active ? "Staff deactivated" : "Staff activated");
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/staff/${id}`);
      toast.success("Staff removed");
      load();
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  const owners = (staff || []).filter((s) => s.role === "admin").length;
  const helpers = (staff || []).filter((s) => s.role !== "admin").length;

  return (
    <div className="ce-page ce-stack">
      <PageHeader
        eyebrow="Who can open the book" image={ESTATE}
        title="Staff & access"
        subtitle={`${owners} owner${owners === 1 ? "" : "s"} · ${helpers} staff account${helpers === 1 ? "" : "s"}. Only the owner can create or remove accounts.`}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <button data-testid="add-staff-button" className="ce-cta">
                <UserPlus /> Add staff
              </button>
            </DialogTrigger>
            <DialogContent className="ce-dialog">
              <DialogHeader>
                <DialogTitle className="ce-dialog-title">New staff account</DialogTitle>
              </DialogHeader>
              <form onSubmit={add}>
                <div className="ce-field">
                  <label>Full name *</label>
                  <input required value={form.name} data-testid="staff-name-input"
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="ce-input" placeholder="e.g. Ngozi Bassey" />
                </div>
                <div className="ce-field">
                  <label>Email *</label>
                  <input type="email" required value={form.email} data-testid="staff-email-input"
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="ce-input" placeholder="name@example.com" />
                </div>
                <div className="ce-field">
                  <label>Password *</label>
                  <input type="text" required value={form.password} data-testid="staff-password-input"
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="ce-input" placeholder="A password they will change" />
                </div>
                <DialogFooter className="mt-4">
                  <button type="submit" data-testid="save-staff-button"
                    className="ce-cta" style={{ width: "100%" }}>
                    Create account
                  </button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {!staff ? (
        <div className="ce-spin"><Loader2 className="w-10 h-10 animate-spin" /></div>
      ) : (
        <div className="ce-list" data-testid="staff-list">
          {staff.map((s, i) => (
            <article key={s.id} data-testid={`staff-row-${s.id}`}
              className={`ce-card ce-rise ce-d${(i % 4) + 1}`}
              style={{ padding: "18px 20px" }}>
              <div className="flex items-center gap-4 flex-wrap">
                <div className="ce-id" style={{ minWidth: 52, borderRadius: "50%", height: 52, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                  {s.role === "admin" ? <ShieldCheck style={{ width: 24, height: 24 }} /> : <User style={{ width: 24, height: 24 }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="ce-row-title">{s.name}</span>
                    <span className={`ce-tag ${s.role === "admin" ? "owner" : "staff"}`}>
                      {s.role === "admin" ? "Owner" : "Staff"}
                    </span>
                    {!s.active && <span className="ce-tag unpaid">Inactive</span>}
                  </div>
                  <div className="ce-row-meta">{s.email} · Added {fmtDate(s.created_at)}</div>
                </div>
                {s.role !== "admin" && (
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-2">
                      <span className="ce-label" style={{ letterSpacing: ".1em" }}>
                        {s.active ? "Active" : "Inactive"}
                      </span>
                      <Switch checked={s.active} onCheckedChange={() => toggleActive(s)}
                        data-testid={`staff-active-toggle-${s.id}`} />
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button data-testid={`delete-staff-${s.id}`} aria-label={`Remove ${s.name}`}
                          className="ce-pen" style={{ background: "rgba(176,32,32,.14)", borderColor: "rgba(176,32,32,.4)", color: "#8F1D1D" }}>
                          <Trash2 />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="ce-dialog">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="ce-dialog-title" style={{ color: "#8F1D1D" }}>
                            Remove {s.name}?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="ce-note">
                            This staff member loses access to the ledger immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="ce-pill">Cancel</AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <button onClick={() => remove(s.id)} className="ce-cta rust sm">Remove</button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="ce-card ce-card-dark ce-rise ce-d4">
        <div className="ce-card-title"><ShieldCheck /> What staff can and cannot see</div>
        <p className="ce-note" style={{ marginTop: 10 }}>
          Staff can record customers, cocoa arrivals and repayments. Your private buying rate and the
          live global market stay owner-only, and only the owner can add or remove accounts.
        </p>
      </div>
    </div>
  );
}

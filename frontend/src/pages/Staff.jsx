import { useEffect, useState } from "react";
import { api, apiErr, fmtDate } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserCog, UserPlus, Loader2, Trash2, ShieldCheck, User } from "lucide-react";
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

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-4xl font-bold text-[#3B1E10] flex items-center gap-3">
            <UserCog className="w-9 h-9 text-[#8C4A27]" /> Staff Management
          </h1>
          <p className="text-lg text-[#5C4638] mt-1">Only the owner can create and manage staff accounts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-staff-button"
              className="h-14 px-6 text-lg font-bold bg-[#8C4A27] hover:bg-[#3B1E10] text-white border-2 border-[#3B1E10]/20">
              <UserPlus className="w-5 h-5 mr-2" /> Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#FAF5EF]">
            <DialogHeader><DialogTitle className="font-heading text-2xl text-[#3B1E10]">New Staff Account</DialogTitle></DialogHeader>
            <form onSubmit={add} className="space-y-4">
              <div>
                <Label className="text-base font-semibold">Full name *</Label>
                <Input required value={form.name} data-testid="staff-name-input"
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]" />
              </div>
              <div>
                <Label className="text-base font-semibold">Email *</Label>
                <Input type="email" required value={form.email} data-testid="staff-email-input"
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]" />
              </div>
              <div>
                <Label className="text-base font-semibold">Password *</Label>
                <Input type="text" required value={form.password} data-testid="staff-password-input"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 h-12 text-lg bg-white border-2 border-[#8C6D58]" />
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="save-staff-button"
                  className="w-full h-12 text-lg font-bold bg-[#8C4A27] hover:bg-[#3B1E10] text-white">Create Account</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!staff ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8C4A27]" /></div>
      ) : (
        <div className="grid gap-3" data-testid="staff-list">
          {staff.map((s) => (
            <Card key={s.id} data-testid={`staff-row-${s.id}`}
              className="p-5 bg-white border-2 border-[#8C6D58]/30 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${s.role === "admin" ? "bg-[#8C4A27]" : "bg-[#1E5E3A]"}`}>
                {s.role === "admin" ? <ShieldCheck className="w-6 h-6 text-white" /> : <User className="w-6 h-6 text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-heading text-xl font-semibold text-[#24140E] flex items-center gap-2">
                  {s.name}
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded-full ${s.role === "admin" ? "bg-[#F4ECE1] text-[#8C4A27]" : "bg-[#e6f0ea] text-[#1E5E3A]"}`}>
                    {s.role === "admin" ? "Owner" : "Staff"}
                  </span>
                </div>
                <div className="text-sm text-[#5C4638]">{s.email} · Added {fmtDate(s.created_at)}</div>
              </div>
              {s.role !== "admin" && (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-[#5C4638]">{s.active ? "Active" : "Inactive"}</span>
                    <Switch checked={s.active} onCheckedChange={() => toggleActive(s)} data-testid={`staff-active-toggle-${s.id}`} />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button data-testid={`delete-staff-${s.id}`} className="text-[#991B1B] p-2 hover:bg-[#FEF2F2] rounded-lg">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#FAF5EF]">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-heading text-xl text-[#991B1B]">Remove {s.name}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-[#5C4638]">This staff member will lose access immediately.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="h-11">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(s.id)} className="h-11 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-bold">Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

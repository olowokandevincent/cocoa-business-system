import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErr, naira } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Users, Banknote, Package, TriangleAlert, ClipboardList, TrendingUp, Lock, ChevronRight, Loader2,
  Pencil, Check, ArrowUp, ArrowDown, Minus,
} from "lucide-react";

function StatTile({ icon: Icon, title, value, sub, accent, testid, onClick, badge, urgent }) {
  return (
    <Card
      data-testid={testid}
      onClick={onClick}
      className={`p-6 bg-white border-2 rounded-xl shadow-md transition-colors animate-fade-up ${
        onClick ? "cursor-pointer hover:border-[#8C4A27]" : ""
      } ${urgent ? "border-[#DC2626] bg-[#FEF2F2]" : "border-[#8C6D58]/30"}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${urgent ? "bg-[#DC2626]" : "bg-[#F4ECE1]"}`}>
          <Icon className={`w-7 h-7 ${urgent ? "text-white" : "text-[#8C4A27]"}`} />
        </div>
        {onClick && <ChevronRight className="w-6 h-6 text-[#8C6D58]" />}
        {badge && <span className="text-xs font-bold uppercase tracking-wide text-[#5C4638] bg-[#F4ECE1] px-2 py-1 rounded-full">{badge}</span>}
      </div>
      <div className="mt-4">
        <div className="text-base font-semibold text-[#5C4638]">{title}</div>
        <div className={`font-heading text-4xl font-bold mt-1 ${accent || "text-[#24140E]"}`}>{value}</div>
        {sub && <div className="text-sm text-[#5C4638] mt-1">{sub}</div>}
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState("");

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  const saveName = async () => {
    if (!nameVal.trim()) return;
    try {
      const { data } = await api.patch("/auth/me", { name: nameVal.trim() });
      setUser(data);
      setEditName(false);
      toast.success("Name updated");
    } catch (e) {
      toast.error(apiErr(e));
    }
  };

  if (!stats)
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8C4A27]" /></div>
    );

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden mb-8 animate-fade-up border-2 border-[#8C6D58]/40 shadow-lg">
        <img
          src="https://images.pexels.com/photos/37516665/pexels-photo-37516665.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Cocoa pods harvest"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#3B1E10] via-[#3B1E10]/90 to-[#3B1E10]/50" />
        <div className="relative z-10 p-8 sm:p-10">
          <p className="text-base sm:text-lg text-[#E3D5C5] font-medium">
            {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          {editName ? (
            <div className="flex items-center gap-2 mt-2 max-w-md">
              <Input
                autoFocus
                value={nameVal}
                data-testid="owner-name-input"
                onChange={(e) => setNameVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveName()}
                placeholder="Your name"
                className="h-12 text-lg bg-white/95 border-2 border-[#D97706] text-[#24140E]"
              />
              <Button onClick={saveName} data-testid="save-owner-name" className="h-12 bg-[#D97706] hover:bg-[#b45309] text-white font-bold">
                <Check className="w-5 h-5" />
              </Button>
            </div>
          ) : (
            <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#FAF5EF] mt-1 flex items-center gap-3 flex-wrap">
              Good day, {user?.name || "there"}.
              <button
                onClick={() => { setNameVal(user?.name || ""); setEditName(true); }}
                data-testid="edit-owner-name"
                className="text-[#D97706] hover:text-[#f59e0b] p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Edit your name"
              >
                <Pencil className="w-6 h-6" />
              </button>
            </h1>
          )}
          <p className="text-lg text-[#E3D5C5] mt-2">Here is what your store looks like today.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatTile
          testid="dashboard-stat-total-customers"
          icon={Users}
          title="Registered Customers"
          value={stats.total_customers}
          badge="Active"
          onClick={() => navigate("/customers")}
        />
        <StatTile
          testid="dashboard-stat-total-money-owed"
          icon={Banknote}
          title="Total Money Currently Owed"
          value={naira(stats.total_owed)}
          accent="text-[#9A3412]"
          sub="Across all customers"
        />
        <StatTile
          testid="dashboard-stat-cocoa-in-store"
          icon={Package}
          title="Cocoa Currently in Store"
          value={`${stats.cocoa_in_store_kg.toLocaleString()} kg`}
          sub={`≈ ${stats.cocoa_in_store_bags} bags (64kg each)`}
          accent="text-[#1E5E3A]"
          onClick={() => navigate("/cocoa-records")}
        />
        <StatTile
          testid="dashboard-stat-unscaled-count"
          icon={TriangleAlert}
          title="Unscaled Cocoa"
          value={stats.unscaled_count}
          sub={stats.unscaled_count > 0 ? "Needs weight entry" : "All deliveries weighed"}
          urgent={stats.unscaled_count > 0}
          onClick={() => navigate("/cocoa-records")}
        />
        <StatTile
          testid="dashboard-stat-todays-records"
          icon={ClipboardList}
          title="Today's Records"
          value={stats.todays_records}
          sub="Deliveries & updates today"
          onClick={() => navigate("/cocoa-records")}
        />
        <Card
          data-testid="dashboard-stat-cocoa-rate-clickable"
          onClick={() => navigate("/cocoa-rate")}
          className="p-6 bg-[#3B1E10] text-[#FAF5EF] border-2 border-[#8C4A27] rounded-xl shadow-md cursor-pointer hover:border-[#D97706] transition-colors animate-fade-up"
        >
          <div className="flex items-start justify-between">
            <div className="w-14 h-14 rounded-xl bg-[#8C4A27] flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <Lock className="w-6 h-6 text-[#D97706]" />
          </div>
          <div className="mt-4">
            <div className="text-base font-semibold text-[#E3D5C5]">Cocoa Rate</div>
            <div className="font-heading text-2xl font-bold mt-1" data-testid="dashboard-rate-confidential">
              Confidential
            </div>
            {stats.rate_trend && stats.rate_trend !== "flat" && stats.rate_change_pct != null ? (
              <div
                data-testid="dashboard-rate-trend"
                className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm ${
                  stats.rate_trend === "up" ? "bg-[#1E5E3A]/40 text-[#6ee7a8]" : "bg-[#991B1B]/40 text-[#fca5a5]"
                }`}
              >
                {stats.rate_trend === "up" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                Market {stats.rate_trend} {Math.abs(stats.rate_change_pct)}%
              </div>
            ) : (
              <div data-testid="dashboard-rate-trend" className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-sm bg-[#4d2a17] text-[#E3D5C5]">
                <Minus className="w-4 h-4" /> Rate steady
              </div>
            )}
            <div className="text-sm text-[#D97706] mt-2 flex items-center gap-1 font-semibold">
              Tap to view on the private rate page <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

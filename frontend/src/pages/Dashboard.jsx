import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, naira } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card } from "@/components/ui/card";
import {
  Users, Banknote, Package, TriangleAlert, ClipboardList, TrendingUp, Lock, ChevronRight, Loader2,
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  if (!stats)
    return (
      <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8C4A27]" /></div>
    );

  return (
    <div>
      <div className="mb-8 animate-fade-up">
        <p className="text-lg text-[#5C4638] font-medium">
          {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1 className="font-heading text-4xl sm:text-5xl font-bold text-[#3B1E10] mt-1">
          Good day, {user?.name?.split(" ")[0] || "there"}.
        </h1>
        <p className="text-lg text-[#5C4638] mt-2">Here is what your store looks like today.</p>
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
            <div className="font-heading text-2xl font-bold mt-1 flex items-center gap-2">
              Confidential
            </div>
            <div className="text-sm text-[#D97706] mt-1 flex items-center gap-1 font-semibold">
              Tap to view on the private rate page <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

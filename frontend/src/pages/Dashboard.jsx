import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErr, naira } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Pencil, Check, ChevronRight, Loader2, ArrowUp, ArrowDown, Minus, Lock,
} from "lucide-react";
import { ResponsiveContainer, LineChart, Line, Tooltip as RTooltip, YAxis } from "recharts";

function TrendBadge({ trend, changePct, testid, dark }) {
  if (trend && trend !== "flat" && changePct != null) {
    return (
      <span data-testid={testid}
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
          dark
            ? trend === "up" ? "bg-[#1E5E3A]/50 text-[#8FE3B0]" : "bg-[#991B1B]/50 text-[#FCA5A5]"
            : trend === "up" ? "bg-[#1E5E3A]/15 text-[#1E5E3A]" : "bg-[#991B1B]/15 text-[#991B1B]"
        }`}>
        {trend === "up" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
        {Math.abs(changePct)}%
      </span>
    );
  }
  return (
    <span data-testid={testid}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
        dark ? "bg-[#3D5346] text-[#CFE0D2]" : "bg-[#F4ECE1] text-[#5C4638]"
      }`}>
      <Minus className="w-4 h-4" /> Steady
    </span>
  );
}

function LedgerRow({ index, label, value, sub, testid, onClick, delay, thumb, urgent, accent, sealed, badge }) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      data-testid={testid}
      onClick={onClick}
      className={`ledger-rise w-full text-left flex items-center gap-4 px-3 sm:px-4 py-4 rounded-md transition-colors ${
        sealed ? "bg-[#23372B]/5" : ""
      } ${onClick ? "hover:bg-[#23372B]/5 cursor-pointer" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="font-mono text-sm text-[#8A8177] w-6 shrink-0">{String(index).padStart(2, "0")}</span>
      {thumb && (
        <span className="hidden sm:block w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-[#23372B]">
          <img src={thumb} alt="" className="w-full h-full object-cover mix-blend-luminosity opacity-80" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-3">
          <span className={`ledger-small-caps text-sm whitespace-nowrap ${urgent ? "text-[#991B1B]" : "text-[#8A8177]"}`}>
            {label}
          </span>
          <span className="ledger-dotted hidden sm:block" />
        </span>
        {sub && <span className="block text-sm text-[#8A8177] mt-0.5">{sub}</span>}
      </span>
      <span className="flex items-center gap-3 shrink-0">
        {badge}
        <span className={`font-heading font-bold text-right leading-none ${
          sealed ? "text-xl text-[#23372B]" : "text-2xl sm:text-3xl"
        } ${accent || "text-[#23372B]"}`}>
          {value}
        </span>
        {onClick && <ChevronRight className="w-5 h-5 text-[#8A8177]" />}
      </span>
    </Wrapper>
  );
}

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === "admin";
  const [stats, setStats] = useState(null);
  const [live, setLive] = useState(null);
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState("");

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  // Owner-only: live global cocoa market, refreshed so the band keeps moving.
  useEffect(() => {
    if (!isAdmin) return;
    let stop = false;
    const pull = () =>
      api.get("/cocoa-rate/live")
        .then((r) => !stop && setLive(r.data))
        .catch(() => !stop && setLive({ available: false }));
    pull();
    const t = setInterval(pull, 30000);
    return () => { stop = true; clearInterval(t); };
  }, [isAdmin]);

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
    return <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#8C4A27]" /></div>;

  const today = new Date().toLocaleDateString("en-NG", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const series = (live?.trend_ngn?.length ? live.trend_ngn : live?.trend || []).map((p) => ({
    date: p.date, value: p.value,
  }));
  const marketNgn = live?.available ? live.ngn_per_kg : null;
  const marketFigure = marketNgn
    ? naira(marketNgn)
    : live?.available && live.usd_per_kg != null
      ? `$${live.usd_per_kg.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
      : "—";

  const rows = [
    { label: "Registered customers", value: stats.total_customers, sub: "Account holders in your book",
      testid: "dashboard-stat-total-customers", to: "/customers" },
    { label: "Total money owed", value: naira(stats.total_owed), sub: "Across all customers",
      testid: "dashboard-stat-total-money-owed", accent: "text-[#9A3412]" },
    { label: "Cocoa in store", value: `${stats.cocoa_in_store_kg.toLocaleString()} kg`,
      sub: `≈ ${stats.cocoa_in_store_bags} bags of 64 kg`, testid: "dashboard-stat-cocoa-in-store",
      to: "/cocoa-records", thumb: "/cocoa/cocoa-beans.jpg" },
    { label: "Unscaled cocoa", value: stats.unscaled_count,
      sub: stats.unscaled_count > 0 ? "Needs weight entry" : "All deliveries weighed",
      testid: "dashboard-stat-unscaled-count", to: "/cocoa-records", urgent: stats.unscaled_count > 0 },
    { label: "Today's records", value: stats.todays_records, sub: "Deliveries & updates today",
      testid: "dashboard-stat-todays-records", to: "/cocoa-records" },
  ];

  return (
    <div className="ledger-paper ledger-margin-rule rounded-lg shadow-[0_14px_50px_rgba(35,55,43,0.14)] overflow-hidden animate-fade-up">
      {/* Dateline strip */}
      <div className="bg-[#23372B] text-[#FBF6EC] px-6 sm:px-10 py-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="ledger-small-caps text-[11px] text-[#9FB39C]">The cocoa ledger · daily record</div>
          <div className="font-heading text-xl sm:text-2xl mt-0.5" data-testid="dashboard-dateline">{today}</div>
        </div>
        <div className="ledger-small-caps text-[11px] text-[#9FB39C] border border-[#3D5346] rounded-full px-4 py-2">
          {isAdmin ? "Owner" : "Staff"}
        </div>
      </div>

      {/* Greeting */}
      <div className="px-6 sm:px-10 pt-8 pb-6">
        {editName ? (
          <div className="flex items-center gap-2 max-w-md">
            <Input autoFocus value={nameVal} data-testid="owner-name-input"
              onChange={(e) => setNameVal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveName()}
              placeholder="Your name"
              className="h-12 text-lg bg-white border-2 border-[#B0651C]" />
            <Button onClick={saveName} data-testid="save-owner-name"
              className="h-12 bg-[#B0651C] hover:bg-[#8a4e15] text-white font-bold">
              <Check className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-[#23372B] flex items-center gap-3 flex-wrap">
            Good day, {user?.name || "there"}.
            <button onClick={() => { setNameVal(user?.name || ""); setEditName(true); }}
              data-testid="edit-owner-name" aria-label="Edit your name"
              className="text-[#B0651C] hover:text-[#8a4e15] p-1.5 rounded-lg hover:bg-[#23372B]/5 transition-colors">
              <Pencil className="w-5 h-5" />
            </button>
          </h1>
        )}
        <p className="text-lg text-[#8A8177] mt-2">Here is what your store looks like today.</p>
      </div>

      {/* Market band */}
      <div className="relative overflow-hidden border-y border-[#D9CFBA]">
        <div className="absolute inset-0 bg-[#23372B]">
          <img src="/cocoa/cocoa-pods.jpg" alt="Cocoa pods drying in the sun"
            className="w-full h-full object-cover object-right mix-blend-luminosity opacity-90" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#23372B] via-[#23372B]/80 to-[#23372B]/10" />
        <div className="relative px-6 sm:px-10 py-8 grid lg:grid-cols-2 gap-6 items-center">
          <div>
            <div className="ledger-small-caps text-[11px] text-[#9FB39C] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#8FE3B0] ledger-pulse" />
              {isAdmin ? "Live global cocoa market" : "Cocoa buying rate"}
            </div>
            {isAdmin ? (
              <>
                <div className="flex items-end gap-3 mt-2 flex-wrap">
                  <div className="font-heading text-5xl sm:text-6xl font-bold text-[#FBF6EC]"
                    data-testid="dashboard-market-price">
                    {marketFigure}
                    <span className="text-2xl text-[#9FB39C] font-normal"> /kg</span>
                  </div>
                  {live?.available && (
                    <TrendBadge dark trend={live.direction} changePct={live.change_pct}
                      testid="dashboard-live-trend" />
                  )}
                </div>
                <div className="text-sm text-[#9FB39C] mt-2">
                  {live == null
                    ? "Fetching the world market…"
                    : live.available
                      ? <>ICE cocoa futures, converted at ₦{live.usdngn?.toLocaleString()}/$ · {live.date}</>
                      : (live.message || "The global market is unreachable right now.")}
                </div>
              </>
            ) : (
              <>
                <div className="font-heading text-5xl sm:text-6xl font-bold text-[#FBF6EC] mt-2 flex items-center gap-3">
                  <Lock className="w-8 h-8 text-[#B0651C]" /> Confidential
                </div>
                <div className="text-sm text-[#9FB39C] mt-2">
                  Your buying rate stays private — open the Cocoa Rate page to view or set it.
                </div>
              </>
            )}
          </div>

          {isAdmin && live?.available && series.length > 1 ? (
            <div className="h-36 sm:h-40 -mx-2" data-testid="dashboard-market-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series}>
                  <YAxis hide domain={["auto", "auto"]} />
                  <RTooltip formatter={(v) => [naira(v) + "/kg", "Market"]}
                    contentStyle={{ borderRadius: 12, border: "2px solid #3D5346", background: "#1b2a21", color: "#FBF6EC" }}
                    labelStyle={{ color: "#9FB39C" }} />
                  <Line type="monotone" dataKey="value" stroke="#C98A3D" strokeWidth={3}
                    dot={false} activeDot={{ r: 6 }} animationDuration={1600} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="hidden lg:block text-right">
              <div className="font-heading text-7xl text-[#3D5346]">₦</div>
            </div>
          )}
        </div>
      </div>

      {/* Ledger rows */}
      <div className="grid lg:grid-cols-2 gap-x-10 px-4 sm:px-7 py-8">
        <div className="space-y-1">
          {rows.slice(0, 3).map((r, i) => (
            <LedgerRow key={r.testid} index={i + 1} {...r} delay={120 + i * 90}
              onClick={r.to ? () => navigate(r.to) : undefined} />
          ))}
        </div>
        <div className="space-y-1">
          {rows.slice(3).map((r, i) => (
            <LedgerRow key={r.testid} index={i + 4} {...r} delay={420 + i * 90}
              onClick={r.to ? () => navigate(r.to) : undefined} />
          ))}
          <LedgerRow index={6} label="Cocoa buying rate" value="Confidential" sealed
            testid="dashboard-stat-cocoa-rate-clickable"
            badge={<TrendBadge trend={stats.rate_trend} changePct={stats.rate_change_pct} testid="dashboard-rate-trend" />}
            delay={600} onClick={() => navigate("/cocoa-rate")} />
          <span className="sr-only" data-testid="dashboard-rate-confidential">Cocoa rate is confidential</span>
        </div>
      </div>
    </div>
  );
}

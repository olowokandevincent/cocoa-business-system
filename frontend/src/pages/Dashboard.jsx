import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErr, naira } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Pencil, Check, Loader2, Lock } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip as RTooltip, YAxis } from "recharts";
import {
  TrendBadge, GlassTileTall, GlassTileRow, GlassTileRate,
} from "@/components/dashboard/GlassTile";

const MARKET_HERO = "https://media.base44.com/images/public/6ac9ebc188dc43be05e8c9be/0b8b0e136_generated_b629c5f8.jpg";
const STORE_BAG = "https://media.base44.com/images/public/6ac9ebc188dc43be05e8c9be/a1ccc29de_generated_eeff9bfd.jpg";

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

  // Owner-only: live global cocoa market, refreshed so the readout keeps moving.
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
    return (
      <div className="gh-page">
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-[#D97706]" />
        </div>
      </div>
    );

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
  const chartReady = isAdmin && live?.available && series.length > 1;

  return (
    <div className="gh-page">
      {/* Dateline sheet */}
      <div className="gh-glass gh-date">
        <div>
          <div className="gh-eb">The cocoa ledger · daily record</div>
          <div className="gh-dt gh-mono" data-testid="dashboard-dateline">{today}</div>
        </div>
        <div className="gh-pill">{isAdmin ? "Owner" : "Staff"}</div>
      </div>

      {/* Greeting */}
      <div className="gh-greet">
        <h1>
          Good day, {user?.name || "there"}.
          <button
            type="button"
            className="gh-pen"
            onClick={() => { setNameVal(user?.name || ""); setEditName(true); }}
            data-testid="edit-owner-name"
            aria-label="Edit your name"
          >
            <Pencil />
          </button>
        </h1>
        <p>Here is what your store looks like today.</p>
      </div>

      {editName && (
        <div className="gh-edit">
          <input
            autoFocus
            value={nameVal}
            data-testid="owner-name-input"
            aria-label="Your name"
            placeholder="Your name"
            onChange={(e) => setNameVal(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
          />
          <button type="button" onClick={saveName} data-testid="save-owner-name" aria-label="Save">
            <Check />
          </button>
        </div>
      )}

      {/* Market band over the harvest photograph */}
      <div className="gh-mk">
        <img src={MARKET_HERO} alt="Split cocoa pods drying on a mat" />
        <div className="gh-sc" />

        <div className="gh-glass gh-mkg">
          {isAdmin ? (
            <>
              <div className="gh-lv">
                <span className="gh-dot" />
                <span className="gh-eb">Live global cocoa market</span>
              </div>
              <div className="gh-big">
                <span className="gh-mono" data-testid="dashboard-market-price">{marketFigure}</span>
                <small>/kg</small>
                {live?.available && (
                  <TrendBadge trend={live.direction} changePct={live.change_pct}
                    testid="dashboard-live-trend" />
                )}
              </div>
              <div className="gh-cap">
                {live == null
                  ? "Fetching the world market…"
                  : live.available
                    ? <>ICE cocoa futures, converted at ₦{live.usdngn?.toLocaleString()}/$ · {live.date}</>
                    : (live.message || "The global market is unreachable right now.")}
              </div>
            </>
          ) : (
            <>
              <div className="gh-lv">
                <span className="gh-dot" />
                <span className="gh-eb" style={{ color: "#7a5a45" }}>Cocoa buying rate</span>
              </div>
              <div className="gh-big" style={{ marginTop: 6 }}>
                <Lock className="gh-lock" />
                <span style={{ fontSize: 36 }}>Confidential</span>
              </div>
              <div className="gh-cap" style={{ marginTop: 8 }}>
                Your buying rate stays private — open the Cocoa Rate page to view or set it.
              </div>
            </>
          )}
        </div>

        <div className="gh-glass gh-chart" data-testid="dashboard-market-chart">
          {chartReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                <defs>
                  <linearGradient id="ghMarketFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#D97706" stopOpacity={0.35} />
                    <stop offset="1" stopColor="#D97706" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["auto", "auto"]} />
                <RTooltip
                  formatter={(v) => [naira(v) + "/kg", "Market"]}
                  contentStyle={{ borderRadius: 14, border: "1px solid rgba(255,255,255,.55)", background: "rgba(251,246,236,.92)", color: "#3B1E10" }}
                  labelStyle={{ color: "#7a5a45" }}
                />
                <Area type="monotone" dataKey="value" stroke="#D97706" strokeWidth={3.5}
                  strokeLinecap="round" fill="url(#ghMarketFill)" dot={false}
                  activeDot={{ r: 6, fill: "#D97706", stroke: "#fff", strokeWidth: 2 }}
                  animationDuration={1600} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <span className="gh-chart-mark gh-mono">₦</span>
          )}
        </div>
      </div>

      {/* Ledger tiles */}
      <div className="gh-tiles">
        <div className="gh-col">
          <GlassTileTall
            index={1} label="Registered customers" value={stats.total_customers}
            sub="Account holders in your book" testid="dashboard-stat-total-customers"
            delay="gh-d1" onClick={() => navigate("/customers")} />
          <GlassTileTall
            index={2} label="Total money owed" value={naira(stats.total_owed)}
            sub="Across all customers" testid="dashboard-stat-total-money-owed"
            delay="gh-d2" valueTone="am" />
          <GlassTileTall
            index={3} label="Cocoa in store" value={`${stats.cocoa_in_store_kg.toLocaleString()} kg`}
            sub={`≈ ${stats.cocoa_in_store_bags} bags of 64 kg`} testid="dashboard-stat-cocoa-in-store"
            delay="gh-d3" valueTone="gr" bagImage={STORE_BAG}
            onClick={() => navigate("/cocoa-records")} />
        </div>

        <div className="gh-col">
          <GlassTileRow
            index={4} label="Unscaled cocoa" value={stats.unscaled_count}
            sub={stats.unscaled_count > 0 ? "Needs weight entry" : "All deliveries weighed"}
            testid="dashboard-stat-unscaled-count" delay="gh-d4"
            labelTone={stats.unscaled_count > 0 ? "u" : undefined}
            valueColor={stats.unscaled_count > 0 ? "#991B1B" : undefined}
            onClick={() => navigate("/cocoa-records")} />
          <GlassTileRow
            index={5} label="Today's records" value={stats.todays_records}
            sub="Deliveries & updates today" testid="dashboard-stat-todays-records"
            delay="gh-d5" onClick={() => navigate("/cocoa-records")} />
          <GlassTileRate
            index={6} testid="dashboard-stat-cocoa-rate-clickable" delay="gh-d6"
            badge={<TrendBadge trend={stats.rate_trend} changePct={stats.rate_change_pct}
              testid="dashboard-rate-trend" />}
            onClick={() => navigate("/cocoa-rate")} />
          <span className="gh-sr" data-testid="dashboard-rate-confidential">Cocoa rate is confidential</span>
        </div>
      </div>

      <div className="gh-foot" />
    </div>
  );
}

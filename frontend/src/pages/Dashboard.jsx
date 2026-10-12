import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErr, naira } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Pencil, Check, Loader2, Lock } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip as RTooltip, YAxis } from "recharts";
import {
  TrendBadge, LedgerTileTall, LedgerTileRow, LedgerTileRate,
} from "@/components/dashboard/LedgerTile";
import { PODS_DRYING, STORE_SACKS } from "@/styles/imagery";

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
      <div className="ce-spin">
        <Loader2 className="w-10 h-10 animate-spin" />
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
    <div className="ce-page ce-stack">
      {/* Dateline sheet */}
      <div className="ce-card ce-date ce-rise ce-d1">
        <div>
          <div className="ce-eyebrow dark">The cocoa ledger · daily record</div>
          <div className="ce-date-v" data-testid="dashboard-dateline">{today}</div>
        </div>
        <span className="ce-chip gold">{isAdmin ? "Owner" : "Staff"}</span>
      </div>

      {/* Greeting */}
      <div className="ce-greet ce-rise ce-d2">
        <h1>
          Good day, {user?.name || "there"}.
          <button
            type="button"
            className="ce-pen"
            onClick={() => { setNameVal(user?.name || ""); setEditName(true); }}
            data-testid="edit-owner-name"
            aria-label="Edit your name"
          >
            <Pencil />
          </button>
        </h1>
        <p>Here is what your store looks like today.</p>

        {editName && (
          <div className="ce-edit" style={{ marginTop: 16 }}>
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
      </div>

      {/* Market band over the drying pods */}
      <div className="ce-band ce-rise ce-d3">
        <img src={PODS_DRYING} alt="Split cocoa pods drying on a mat" />
        <div className="ce-band-scrim" aria-hidden="true" />

        <div className="ce-readout">
          {isAdmin ? (
            <>
              <div className="ce-live">
                <span className="ce-dot" />
                <span className="ce-eyebrow">Live global cocoa market</span>
              </div>
              <div className="ce-big">
                <span data-testid="dashboard-market-price">{marketFigure}</span>
                <small>/kg</small>
                {live?.available && (
                  <TrendBadge trend={live.direction} changePct={live.change_pct}
                    testid="dashboard-live-trend" />
                )}
              </div>
              <div className="ce-caption">
                {live == null
                  ? "Fetching the world market…"
                  : live.available
                    ? <>ICE cocoa futures, converted at ₦{live.usdngn?.toLocaleString()}/$ · {live.date}</>
                    : (live.message || "The global market is unreachable right now.")}
              </div>
            </>
          ) : (
            <>
              <div className="ce-live">
                <span className="ce-dot" />
                <span className="ce-eyebrow">Cocoa buying rate</span>
              </div>
              <div className="ce-big">
                <Lock className="ce-lock" />
                <span style={{ fontSize: 34 }}>Confidential</span>
              </div>
              <div className="ce-caption">
                Your buying rate stays private — open the Cocoa Rate page to view or set it.
              </div>
            </>
          )}
        </div>

        <div className="ce-chart" data-testid="dashboard-market-chart">
          {chartReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
                <defs>
                  <linearGradient id="ceMarketFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#F0B457" stopOpacity={0.45} />
                    <stop offset="1" stopColor="#F0B457" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis hide domain={["auto", "auto"]} />
                <RTooltip
                  formatter={(v) => [naira(v) + "/kg", "Market"]}
                  contentStyle={{ borderRadius: 14, border: "1px solid rgba(240,180,87,.5)", background: "rgba(24,13,6,.92)", color: "#FFF3E0" }}
                  labelStyle={{ color: "#F0B457" }}
                />
                <Area type="monotone" dataKey="value" stroke="#F0B457" strokeWidth={3.5}
                  strokeLinecap="round" fill="url(#ceMarketFill)" dot={false}
                  activeDot={{ r: 6, fill: "#F0B457", stroke: "#2A1810", strokeWidth: 2 }}
                  animationDuration={1600} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <span className="ce-chart-mark">₦</span>
          )}
        </div>
      </div>

      {/* Ledger tiles */}
      <div className="ce-tiles">
        <div className="ce-col">
          <LedgerTileTall
            index={1} label="Registered customers" value={stats.total_customers}
            sub="Account holders in your book" testid="dashboard-stat-total-customers"
            delay="ce-d1" onClick={() => navigate("/customers")} />
          <LedgerTileTall
            index={2} label="Total money owed" value={naira(stats.total_owed)}
            sub="Across all customers" testid="dashboard-stat-total-money-owed"
            delay="ce-d2" valueTone="am" />
          <LedgerTileTall
            index={3} label="Cocoa in store" value={`${stats.cocoa_in_store_kg.toLocaleString()} kg`}
            sub={`≈ ${stats.cocoa_in_store_bags} bags of 64 kg`} testid="dashboard-stat-cocoa-in-store"
            delay="ce-d3" valueTone="gr" bagImage={STORE_SACKS}
            onClick={() => navigate("/cocoa-records")} />
        </div>

        <div className="ce-col">
          <LedgerTileRow
            index={4} label="Unscaled cocoa" value={stats.unscaled_count}
            sub={stats.unscaled_count > 0 ? "Needs weight entry" : "All deliveries weighed"}
            testid="dashboard-stat-unscaled-count" delay="ce-d4"
            labelTone={stats.unscaled_count > 0 ? "u" : undefined}
            valueColor={stats.unscaled_count > 0 ? "#991B1B" : undefined}
            onClick={() => navigate("/cocoa-records")} />
          <LedgerTileRow
            index={5} label="Today's records" value={stats.todays_records}
            sub="Deliveries & updates today" testid="dashboard-stat-todays-records"
            delay="ce-d5" onClick={() => navigate("/cocoa-records")} />
          <LedgerTileRate
            index={6} testid="dashboard-stat-cocoa-rate-clickable" delay="ce-d6"
            badge={<TrendBadge trend={stats.rate_trend} changePct={stats.rate_change_pct}
              testid="dashboard-rate-trend" />}
            onClick={() => navigate("/cocoa-rate")} />
          <span className="ce-sr" data-testid="dashboard-rate-confidential">Cocoa rate is confidential</span>
        </div>
      </div>
    </div>
  );
}

import { ChevronRight, ArrowUp, ArrowDown, Minus } from "lucide-react";

const num = (i) => String(i).padStart(2, "0");

function valueClass(tone) {
  if (tone === "am") return "gh-val am gh-mono";
  if (tone === "gr") return "gh-val gr gh-mono";
  return "gh-val gh-mono";
}

/** Trend badge for the market readout and the cocoa-rate tile. */
export function TrendBadge({ trend, changePct, testid }) {
  if (trend && trend !== "flat" && changePct != null) {
    const up = trend === "up";
    return (
      <span data-testid={testid} className="gh-badge"
        style={up
          ? { background: "rgba(30,94,58,.12)", color: "#1E5E3A" }
          : { background: "rgba(153,27,27,.12)", color: "#991B1B" }}>
        {up ? <ArrowUp /> : <ArrowDown />}
        {Math.abs(changePct)}%
      </span>
    );
  }
  return (
    <span data-testid={testid} className="gh-badge">
      <Minus /> Steady
    </span>
  );
}

/** Tall tile: label block on top, figure block at the bottom. */
export function GlassTileTall({
  index, label, value, sub, testid, onClick, delay,
  valueTone, labelTone, bagImage,
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      data-testid={testid}
      onClick={onClick}
      className={`gh-glass gh-row gh-tall ${delay}`}
      style={onClick ? undefined : { cursor: "default" }}
    >
      {bagImage && <span className="gh-bag"><img src={bagImage} alt="" /></span>}
      {onClick && <ChevronRight className="gh-ch" />}
      <div className={bagImage ? "gh-in" : undefined}>
        <span className="gh-num gh-mono">{num(index)}</span>
        <div className={`gh-lab ${labelTone === "u" ? "u" : ""}`}>{label}</div>
      </div>
      <div className={bagImage ? "gh-in" : undefined}>
        <div className={valueClass(valueTone)}>{value}</div>
        <div className="gh-sub">{sub}</div>
      </div>
    </Wrapper>
  );
}

/** Flat tile: number, label and figure stacked in one row. */
export function GlassTileRow({
  index, label, value, sub, testid, onClick, delay, labelTone, valueColor,
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      data-testid={testid}
      onClick={onClick}
      className={`gh-glass gh-row ${delay}`}
    >
      {onClick && <ChevronRight className="gh-ch" />}
      <span className="gh-num gh-mono">{num(index)}</span>
      <div className={`gh-lab ${labelTone === "u" ? "u" : ""}`}>{label}</div>
      <div className={valueClass()} style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      <div className="gh-sub">{sub}</div>
    </Wrapper>
  );
}

/** The private buying-rate tile — never shows a figure. */
export function GlassTileRate({ index, testid, badge, onClick, delay }) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      className={`gh-glass gh-row ${delay}`}
      style={{ background: "rgba(30,94,58,.14)" }}
    >
      <span className="gh-num gh-mono">{num(index)}</span>
      <div className="gh-lab">Cocoa buying rate</div>
      <div className="gh-seal">
        <div className="gh-val gh-mono" style={{ marginTop: 0, fontSize: 36 }}>Confidential</div>
        {badge}
        <ChevronRight style={{ width: 20, height: 20, color: "#8A8177" }} />
      </div>
    </button>
  );
}

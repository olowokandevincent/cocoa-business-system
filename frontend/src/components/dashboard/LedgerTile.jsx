import { ChevronRight, ArrowUp, ArrowDown, Minus } from "lucide-react";

const num = (i) => String(i).padStart(2, "0");

function valueClass(tone) {
  if (tone === "am") return "ce-figure am";
  if (tone === "gr") return "ce-figure gr";
  if (tone === "rd") return "ce-figure rd";
  return "ce-figure";
}

/** Trend badge for the market readout and the cocoa-rate tile. */
export function TrendBadge({ trend, changePct, testid }) {
  if (trend && trend !== "flat" && changePct != null) {
    const up = trend === "up";
    return (
      <span data-testid={testid} className={`ce-chip ${up ? "up" : "down"}`}>
        {up ? <ArrowUp /> : <ArrowDown />}
        {Math.abs(changePct)}%
      </span>
    );
  }
  return (
    <span data-testid={testid} className="ce-chip">
      <Minus /> Steady
    </span>
  );
}

/** Tall tile: label block on top, figure block at the bottom. */
export function LedgerTileTall({
  index, label, value, sub, testid, onClick, delay,
  valueTone, labelTone, bagImage,
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      data-testid={testid}
      onClick={onClick}
      className={`ce-card ce-tile ce-tile-tall ce-rise ${delay}`}
      style={onClick ? undefined : { cursor: "default" }}
    >
      {bagImage && <span className="ce-tile-art"><img src={bagImage} alt="" /></span>}
      <div className="ce-tile-top ce-tile-in">
        <div>
          <span className="ce-tile-num">{num(index)}</span>
          <div className={`ce-label ${labelTone === "u" ? "u" : ""}`} style={{ marginTop: 8 }}>{label}</div>
        </div>
        {onClick && <ChevronRight className="ce-chev" />}
      </div>
      <div className="ce-tile-in">
        <div className={`${valueClass(valueTone)} ce-tile-val`}>{value}</div>
        <div className="ce-tile-sub">{sub}</div>
      </div>
    </Wrapper>
  );
}

/** Flat tile: number, label and figure stacked together. */
export function LedgerTileRow({
  index, label, value, sub, testid, onClick, delay, labelTone, valueColor,
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      data-testid={testid}
      onClick={onClick}
      className={`ce-card ce-tile ce-rise ${delay}`}
    >
      <div className="ce-tile-top">
        <div>
          <span className="ce-tile-num">{num(index)}</span>
          <div className={`ce-label ${labelTone === "u" ? "u" : ""}`} style={{ marginTop: 8 }}>{label}</div>
        </div>
        {onClick && <ChevronRight className="ce-chev" />}
      </div>
      <div className={valueClass()} style={{ marginTop: 12, fontSize: 40, ...(valueColor ? { color: valueColor } : {}) }}>
        {value}
      </div>
      <div className="ce-tile-sub">{sub}</div>
    </Wrapper>
  );
}

/** The private buying-rate tile — never shows a figure. */
export function LedgerTileRate({ index, testid, badge, onClick, delay }) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      className={`ce-card ce-card-leaf ce-tile ce-rise ${delay}`}
    >
      <div className="ce-tile-top">
        <div>
          <span className="ce-tile-num" style={{ color: "#1E5B38" }}>{num(index)}</span>
          <div className="ce-label" style={{ marginTop: 8 }}>Cocoa buying rate</div>
        </div>
        <ChevronRight className="ce-chev" />
      </div>
      <div className="ce-seal">
        <div className="ce-figure" style={{ fontSize: 34 }}>Confidential</div>
        {badge}
      </div>
    </button>
  );
}

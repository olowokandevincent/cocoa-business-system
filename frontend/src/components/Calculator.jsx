import { useState } from "react";
import { Calculator as CalcIcon } from "lucide-react";

const KEYS = ["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "=", "+"];

export function Calculator({ title = "Calculator" }) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");

  const press = (k) => {
    if (k === "=") {
      try {
        // eslint-disable-next-line no-new-func
        const val = Function(`"use strict";return (${expr})`)();
        setResult(String(Number(val.toFixed ? val.toFixed(2) : val)));
      } catch {
        setResult("Error");
      }
      return;
    }
    setExpr((e) => e + k);
  };

  const bags = expr && !isNaN(Number(expr)) ? (Number(expr) * 64).toLocaleString() : null;

  return (
    <div className="ce-card" data-testid="calculator">
      <div className="ce-card-title"><CalcIcon /> {title}</div>

      <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 14, background: "linear-gradient(180deg,#2A1810,#180D06)", textAlign: "right" }}>
        <div className="ce-figure" style={{ fontSize: 18, color: "#E3D0B4", minHeight: 24, wordBreak: "break-all" }}
          data-testid="calc-expression">
          {expr || "0"}
        </div>
        <div className="ce-figure" style={{ fontSize: 26, color: "#F0B457", minHeight: 32 }}
          data-testid="calc-result">
          {result}
        </div>
      </div>

      {bags && (
        <div className="ce-note" style={{ marginTop: 12 }}>
          <b>{expr}</b> bags ≈ <span className="ce-figure gr">{bags} kg</span> (64 kg per bag)
        </div>
      )}

      <div className="grid grid-cols-4 gap-2" style={{ marginTop: 14 }}>
        {KEYS.map((k) => (
          <button
            key={k}
            data-testid={`calc-key-${k}`}
            onClick={() => press(k)}
            className={`ce-key ${k === "=" ? "eq" : "/*+-".includes(k) ? "op" : ""}`}
          >
            {k}
          </button>
        ))}
      </div>

      <button
        data-testid="calc-clear"
        onClick={() => { setExpr(""); setResult(""); }}
        className="ce-cta pale sm"
        style={{ width: "100%", marginTop: 10 }}
      >
        Clear
      </button>
    </div>
  );
}

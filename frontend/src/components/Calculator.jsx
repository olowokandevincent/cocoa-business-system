import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    <Card className="p-5 bg-[#F4ECE1] border-2 border-[#8C6D58]/40" data-testid="calculator">
      <div className="flex items-center gap-2 mb-3">
        <CalcIcon className="w-5 h-5 text-[#8C4A27]" />
        <h3 className="font-heading text-xl font-semibold text-[#3B1E10]">{title}</h3>
      </div>
      <div className="bg-[#24140E] rounded-lg p-3 mb-3 text-right">
        <div className="font-mono text-[#E3D5C5] text-lg min-h-[24px] break-all" data-testid="calc-expression">
          {expr || "0"}
        </div>
        <div className="font-mono text-[#D97706] text-2xl font-bold min-h-[32px]" data-testid="calc-result">
          {result}
        </div>
      </div>
      {bags && (
        <div className="text-sm text-[#5C4638] mb-3 bg-white rounded-lg px-3 py-2 border border-[#E3D5C5]">
          <span className="font-semibold">{expr}</span> bags ≈{" "}
          <span className="font-mono font-bold text-[#1E5E3A]">{bags} kg</span> (64kg/bag)
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {KEYS.map((k) => (
          <button
            key={k}
            data-testid={`calc-key-${k}`}
            onClick={() => press(k)}
            className={`h-12 rounded-lg font-mono text-lg font-bold transition-colors ${
              k === "="
                ? "bg-[#8C4A27] text-white hover:bg-[#3B1E10]"
                : "/*+-".includes(k)
                ? "bg-[#D97706] text-white hover:bg-[#b45309]"
                : "bg-white text-[#24140E] hover:bg-[#E3D5C5] border border-[#E3D5C5]"
            }`}
          >
            {k}
          </button>
        ))}
      </div>
      <Button
        variant="outline"
        data-testid="calc-clear"
        onClick={() => { setExpr(""); setResult(""); }}
        className="w-full mt-2 border-2 border-[#8C6D58]/40 text-[#24140E] font-semibold h-11"
      >
        Clear
      </Button>
    </Card>
  );
}

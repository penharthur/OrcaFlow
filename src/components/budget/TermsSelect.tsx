import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// ─── Parsers: detect mode + values from existing string ──────────────────────

type PaymentMode = "combinar" | "percent" | "uteis" | "corridos";
type ExecutionMode = "combinar" | "uteis" | "corridos";

function parsePaymentMode(value: string): {
  mode: PaymentMode;
  pct1: string;
  pct2: string;
  days: string;
} {
  const pctMatch = value.match(/^(\d+(?:[.,]\d+)?)%.*?(\d+(?:[.,]\d+)?)%/);
  if (pctMatch) return { mode: "percent", pct1: pctMatch[1], pct2: pctMatch[2], days: "30" };

  const uteisMatch = value.match(/^(\d+)\s+dias?\s+[uú]teis/i);
  if (uteisMatch) return { mode: "uteis", pct1: "50", pct2: "50", days: uteisMatch[1] };

  const corridosMatch = value.match(/^(\d+)\s+dias?\s+corridos/i);
  if (corridosMatch) return { mode: "corridos", pct1: "50", pct2: "50", days: corridosMatch[1] };

  return { mode: "combinar", pct1: "50", pct2: "50", days: "30" };
}

function parseExecutionMode(value: string): { mode: ExecutionMode; days: string } {
  const uteisMatch = value.match(/^(\d+)\s+dias?\s+[uú]teis/i);
  if (uteisMatch) return { mode: "uteis", days: uteisMatch[1] };

  const corridosMatch = value.match(/^(\d+)\s+dias?\s+corridos/i);
  if (corridosMatch) return { mode: "corridos", days: corridosMatch[1] };

  return { mode: "combinar", days: "30" };
}

function buildPayment(mode: PaymentMode, pct1: string, pct2: string, days: string): string {
  if (mode === "combinar") return "A combinar";
  if (mode === "percent") {
    const a = pct1 || "50";
    const b = pct2 || "50";
    return `${a}% no início e ${b}% na entrega`;
  }
  const d = days || "30";
  return `${d} dias ${mode === "uteis" ? "úteis" : "corridos"}`;
}

function buildExecution(mode: ExecutionMode, days: string): string {
  if (mode === "combinar") return "A combinar";
  const d = days || "30";
  return `${d} dias ${mode === "uteis" ? "úteis" : "corridos"}`;
}

// ─── PaymentTermsSelect ───────────────────────────────────────────────────────

type PaymentProps = { value: string; onChange: (v: string) => void };

export function PaymentTermsSelect({ value, onChange }: PaymentProps) {
  const init = parsePaymentMode(value);
  const [mode, setMode] = useState<PaymentMode>(init.mode);
  const [pct1, setPct1] = useState(init.pct1);
  const [pct2, setPct2] = useState(init.pct2);
  const [days, setDays] = useState(init.days);

  const handleMode = (m: string) => {
    const next = m as PaymentMode;
    setMode(next);
    onChange(buildPayment(next, pct1, pct2, days));
  };

  return (
    <div className="space-y-2">
      <Select value={mode} onValueChange={handleMode}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="combinar">A combinar</SelectItem>
          <SelectItem value="percent">Porcentagem (entrada / entrega)</SelectItem>
          <SelectItem value="uteis">Dias úteis</SelectItem>
          <SelectItem value="corridos">Dias corridos</SelectItem>
        </SelectContent>
      </Select>

      {mode === "percent" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            className="w-16 text-center"
            inputMode="decimal"
            placeholder="50"
            value={pct1}
            onChange={(e) => {
              setPct1(e.target.value);
              onChange(buildPayment(mode, e.target.value, pct2, days));
            }}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">% no início e</span>
          <Input
            className="w-16 text-center"
            inputMode="decimal"
            placeholder="50"
            value={pct2}
            onChange={(e) => {
              setPct2(e.target.value);
              onChange(buildPayment(mode, pct1, e.target.value, days));
            }}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">% na entrega</span>
        </div>
      )}

      {(mode === "uteis" || mode === "corridos") && (
        <div className="flex items-center gap-2">
          <Input
            className="w-20 text-center"
            inputMode="numeric"
            placeholder="30"
            value={days}
            onChange={(e) => {
              setDays(e.target.value);
              onChange(buildPayment(mode, pct1, pct2, e.target.value));
            }}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            dias {mode === "uteis" ? "úteis" : "corridos"}
          </span>
        </div>
      )}

      {/* Live preview */}
      {mode !== "combinar" && (
        <p className="text-[11px] text-muted-foreground">
          Texto:{" "}
          <span className="italic text-foreground">
            {buildPayment(mode, pct1, pct2, days) || "…"}
          </span>
        </p>
      )}
    </div>
  );
}

// ─── ExecutionTermsSelect ─────────────────────────────────────────────────────

type ExecutionProps = { value: string; onChange: (v: string) => void };

export function ExecutionTermsSelect({ value, onChange }: ExecutionProps) {
  const init = parseExecutionMode(value);
  const [mode, setMode] = useState<ExecutionMode>(init.mode);
  const [days, setDays] = useState(init.days);

  const handleMode = (m: string) => {
    const next = m as ExecutionMode;
    setMode(next);
    onChange(buildExecution(next, days));
  };

  return (
    <div className="space-y-2">
      <Select value={mode} onValueChange={handleMode}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="combinar">A combinar</SelectItem>
          <SelectItem value="uteis">Dias úteis</SelectItem>
          <SelectItem value="corridos">Dias corridos</SelectItem>
        </SelectContent>
      </Select>

      {(mode === "uteis" || mode === "corridos") && (
        <div className="flex items-center gap-2">
          <Input
            className="w-20 text-center"
            inputMode="numeric"
            placeholder="30"
            value={days}
            onChange={(e) => {
              setDays(e.target.value);
              onChange(buildExecution(mode, e.target.value));
            }}
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            dias {mode === "uteis" ? "úteis" : "corridos"}
          </span>
        </div>
      )}

      {mode !== "combinar" && (
        <p className="text-[11px] text-muted-foreground">
          Texto:{" "}
          <span className="italic text-foreground">
            {buildExecution(mode, days) || "…"}
          </span>
        </p>
      )}
    </div>
  );
}

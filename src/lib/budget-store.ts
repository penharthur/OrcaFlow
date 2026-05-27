import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";

export type BudgetItem = {
  id: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
};

export type BudgetData = {
  clientName: string;
  /** Full legal name — optional, used in receipt body ("recebi de <full name>") */
  clientFullName: string;
  clientId: string | null;
  /** Structured address — replaces the old flat `address: string` */
  addressCondo: string;   // Condomínio (optional)
  addressStreet: string;  // Rua / Avenida
  addressNumber: string;  // Número
  addressApt: string;     // Apartamento (optional)
  addressCity: string;    // Cidade do cliente / serviço
  city: string;           // Cidade do profissional (data nos documentos)
  date: string;           // ISO
  rawScope: string;
  items: BudgetItem[];
  surcharge: number;
  discount: number;
  materialIncluded: boolean;
  paymentTerms: string;
  executionTerms: string;
  professionalName: string;
  contactEmail: string;
  contactPhone: string;
  /** Valor global do serviço. Quando > 0, substitui o cálculo por item no total. */
  globalValue: number;
};

const KEY = "budget:data";
const BG_KEY = "budget:bg";

export const newItem = (): BudgetItem => ({
  id: uuidv4(),
  description: "",
  quantity: null,
  unitPrice: null,
});

export const defaultBudget = (): BudgetData => ({
  clientName: "",
  clientFullName: "",
  clientId: null,
  addressCondo: "",
  addressStreet: "",
  addressNumber: "",
  addressApt: "",
  addressCity: "Santos",
  city: "Santos",
  date: new Date().toISOString(),
  rawScope: "",
  items: [newItem()],
  surcharge: 0,
  discount: 0,
  materialIncluded: false,
  paymentTerms: "50% no início, 50% na entrega",
  executionTerms: "A combinar",
  professionalName: "",
  contactEmail: "",
  contactPhone: "",
  globalValue: 0,
});

/**
 * Build a displayable address string from structured fields.
 * @param separator  "\n" for multi-line (preview), ", " for inline (receipt body)
 */
export function buildAddress(d: BudgetData, separator = "\n"): string {
  const parts: string[] = [];
  if (d.addressCondo) parts.push(`Cond. ${d.addressCondo}`);
  const streetLine = [d.addressStreet, d.addressNumber].filter(Boolean).join(", ");
  if (streetLine) parts.push(streetLine + (d.addressApt ? `, Apto ${d.addressApt}` : ""));
  if (d.addressCity) parts.push(d.addressCity);
  return parts.join(separator);
}

export function useBudget() {
  const [data, setData] = useState<BudgetData>(() => {
    if (typeof window === "undefined") return defaultBudget();
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultBudget();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      return {
        ...defaultBudget(),
        ...parsed,
        // Migrate legacy flat `address` string → addressStreet (keeps old data usable)
        addressStreet:
          parsed.addressStreet !== undefined
            ? (parsed.addressStreet as string)
            : ((parsed.address as string) ?? ""),
      };
    } catch {
      return defaultBudget();
    }
  });
  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data));
  }, [data]);
  return [data, setData] as const;
}

export function useBackground() {
  const [bg, setBg] = useState<string | null>(() =>
    typeof window === "undefined" ? null : localStorage.getItem(BG_KEY),
  );
  useEffect(() => {
    if (bg) localStorage.setItem(BG_KEY, bg);
    else localStorage.removeItem(BG_KEY);
  }, [bg]);
  return [bg, setBg] as const;
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function computeTotals(d: BudgetData) {
  const subtotal = d.items.reduce((s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0), 0);
  const isGlobal = (d.globalValue ?? 0) > 0;
  const base = isGlobal ? (d.globalValue ?? 0) : subtotal;
  const total = base + (d.surcharge || 0) - (d.discount || 0);
  return { subtotal, total, isGlobal, base };
}

// ─── Number → Brazilian Portuguese words ──────────────────────────────────────

const ONES = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
  "dezessete", "dezoito", "dezenove",
];
const TENS = [
  "", "", "vinte", "trinta", "quarenta", "cinquenta",
  "sessenta", "setenta", "oitenta", "noventa",
];
const HUNDREDS = [
  "", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos",
  "seiscentos", "setecentos", "oitocentos", "novecentos",
];

function chunkToWords(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(HUNDREDS[Math.floor(n / 100)]);
    n %= 100;
  }
  if (n >= 20) {
    const ten = TENS[Math.floor(n / 10)];
    const one = n % 10 ? ONES[n % 10] : "";
    parts.push(one ? `${ten} e ${one}` : ten);
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" e ");
}

function integerToWords(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  if (n >= 1_000_000) {
    const m = Math.floor(n / 1_000_000);
    parts.push(`${integerToWords(m)} ${m === 1 ? "milhão" : "milhões"}`);
    n %= 1_000_000;
  }
  if (n >= 1_000) {
    const t = Math.floor(n / 1_000);
    parts.push(t === 1 ? "mil" : `${integerToWords(t)} mil`);
    n %= 1_000;
  }
  if (n > 0) parts.push(chunkToWords(n));
  return parts.join(" e ");
}

/**
 * Convert a BRL monetary value to Brazilian Portuguese words.
 * e.g. 1250.50 → "mil e duzentos e cinquenta reais e cinquenta centavos"
 */
export function numberToWordsBRL(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  const totalCents = Math.round(value * 100);
  const intPart = Math.floor(totalCents / 100);
  const centPart = totalCents % 100;

  const intWords = integerToWords(intPart);
  const intStr = intPart === 0 ? "" : `${intWords} ${intPart === 1 ? "real" : "reais"}`;

  if (centPart === 0) return intStr;

  const centStr = `${chunkToWords(centPart)} ${centPart === 1 ? "centavo" : "centavos"}`;
  if (!intStr) return centStr;
  return `${intStr} e ${centStr}`;
}

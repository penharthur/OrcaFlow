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
  clientId: string | null;
  address: string;
  date: string; // ISO
  rawScope: string;
  items: BudgetItem[];
  surcharge: number;
  discount: number;
  materialIncluded: boolean;
  paymentTerms: string;
  executionTerms: string;
  contactEmail: string;
  contactPhone: string;
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
  clientId: null,
  address: "",
  date: new Date().toISOString(),
  rawScope: "",
  items: [newItem()],
  surcharge: 0,
  discount: 0,
  materialIncluded: false,
  paymentTerms: "50% no início, 50% na entrega",
  executionTerms: "A combinar",
  contactEmail: "",
  contactPhone: "",
});

export function useBudget() {
  const [data, setData] = useState<BudgetData>(() => {
    if (typeof window === "undefined") return defaultBudget();
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...defaultBudget(), ...JSON.parse(raw) } : defaultBudget();
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
  const subtotal = d.items.reduce(
    (s, i) => s + (i.quantity ?? 0) * (i.unitPrice ?? 0),
    0,
  );
  const total = subtotal + (d.surcharge || 0) - (d.discount || 0);
  return { subtotal, total };
}

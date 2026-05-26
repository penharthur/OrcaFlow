import { useEffect, useState } from "react";

export type BudgetItem = {
  id: string;
  description: string;
  quantity: number | null;
  unitPrice: number | null;
};

export type BudgetData = {
  clientName: string;
  address: string;
  date: string; // ISO
  items: BudgetItem[];
  manualTotal: number | null;
  materialIncluded: boolean;
  paymentTerms: string;
  executionTerms: string;
  contactEmail: string;
  contactPhone: string;
};

const KEY = "budget:data";
const BG_KEY = "budget:bg";
const AUTH_KEY = "budget:auth";

export const defaultBudget = (): BudgetData => ({
  clientName: "",
  address: "",
  date: new Date().toISOString(),
  items: [{ id: crypto.randomUUID(), description: "", quantity: null, unitPrice: null }],
  manualTotal: null,
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

export const auth = {
  isLoggedIn: () => typeof window !== "undefined" && localStorage.getItem(AUTH_KEY) === "1",
  login: () => localStorage.setItem(AUTH_KEY, "1"),
  logout: () => localStorage.removeItem(AUTH_KEY),
};

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

import { useEffect, useState } from "react";

export type DescriptionMode = "auto" | "custom";

export type ReceiptData = {
  receiverName: string;
  // payerName and address are shared with BudgetData (clientName + address fields)
  city: string;
  value: number;
  date: string; // ISO
  descriptionMode: DescriptionMode;
  /** Used only when descriptionMode === "custom". In "auto" mode the text is computed. */
  serviceDescription: string;
  /** Manual override for value in words. If empty, auto-computed from value. */
  valueInWords: string;
  contactEmail: string;
  contactPhone: string;
};

const KEY = "receipt:data";

export const defaultReceipt = (): ReceiptData => ({
  receiverName: "",
  city: "Santos",
  value: 0,
  date: new Date().toISOString(),
  descriptionMode: "auto",
  serviceDescription: "",
  valueInWords: "",
  contactEmail: "",
  contactPhone: "",
});

export function useReceipt() {
  const [data, setData] = useState<ReceiptData>(() => {
    if (typeof window === "undefined") return defaultReceipt();
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...defaultReceipt(), ...JSON.parse(raw) } : defaultReceipt();
    } catch {
      return defaultReceipt();
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(data));
  }, [data]);

  return [data, setData] as const;
}

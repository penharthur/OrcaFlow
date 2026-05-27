import { supabase } from "@/integrations/supabase/client";
import type { ReceiptData } from "./receipt-store";
import type { BudgetData } from "./budget-store";

/** Shape stored in Supabase — payload bundles both receipt + budget fields */
export type SavedReceipt = {
  id: string;
  payer_name: string | null;
  receiver_name: string | null;
  value: number | null;
  payload: ReceiptData & { budgetData?: BudgetData };
  created_at: string;
};

export async function saveReceipt(
  receipt: ReceiptData,
  budgetData: BudgetData,
  userId: string,
): Promise<void> {
  const { error } = await supabase.from("receipts").insert({
    user_id: userId,
    payer_name: budgetData.clientName?.trim() || null,
    receiver_name: receipt.receiverName?.trim() || null,
    value: receipt.value > 0 ? receipt.value : null,
    payload: { ...receipt, budgetData } as object,
  });
  if (error) throw error;
}

export async function getReceipts(userId: string): Promise<SavedReceipt[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select("id, payer_name, receiver_name, value, payload, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SavedReceipt[];
}

export async function deleteReceipt(id: string): Promise<void> {
  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) throw error;
}

import { supabase } from "@/integrations/supabase/client";
import type { BudgetData } from "./budget-store";
import { buildAddress, computeTotals } from "./budget-store";

export async function searchClients(query: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, address")
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(8);
  if (error) throw error;
  return data ?? [];
}

export async function saveQuote(budget: BudgetData, userId: string) {
  const name = budget.clientName.trim();
  const address = buildAddress(budget, ", "); // compute inline address from structured fields
  if (!name) throw new Error("Informe o nome do cliente.");

  // Find existing clients with same name (case-insensitive)
  const { data: existing, error: findErr } = await supabase
    .from("clients")
    .select("id, name, address")
    .ilike("name", name);
  if (findErr) throw findErr;

  let clientId: string | null = null;
  const sameAddress = existing?.find(
    (c) => (c.address ?? "").trim().toLowerCase() === address.toLowerCase(),
  );
  if (sameAddress) {
    clientId = sameAddress.id;
  } else {
    // Insert new client record (new name OR same name with different address)
    const { data: inserted, error: insErr } = await supabase
      .from("clients")
      .insert({ user_id: userId, name, address })
      .select("id")
      .single();
    if (insErr) throw insErr;
    clientId = inserted.id;
  }

  const { total } = computeTotals(budget);
  const { error: qErr } = await supabase.from("quotes").insert({
    user_id: userId,
    client_id: clientId,
    payload: budget as any,
    total_value: total,
    status: "exported",
  });
  if (qErr) throw qErr;

  return { clientId };
}

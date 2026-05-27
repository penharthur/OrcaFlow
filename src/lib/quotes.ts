import { supabase } from "@/integrations/supabase/client";
import type { BudgetData } from "./budget-store";
import { computeTotals } from "./budget-store";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape returned from Supabase when searching/joining clients */
export type ClientRow = {
  id: string;
  name: string;
  full_name: string | null;
  address_street: string | null;
  address_number: string | null;
  address_condo: string | null;
  address_apt: string | null;
  address_city: string | null;
};

export type SavedQuote = {
  id: string;
  client_id: string | null;
  total_value: number | null;
  status: string | null;
  payload: BudgetData;
  created_at: string;
  clients: ClientRow | null;
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function searchClients(query: string): Promise<ClientRow[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, name, full_name, address_street, address_number, address_condo, address_apt, address_city",
    )
    .ilike("name", `%${query}%`)
    .order("name")
    .limit(8);
  if (error) throw error;
  return (data ?? []) as ClientRow[];
}

export async function getQuotes(userId: string): Promise<SavedQuote[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, client_id, total_value, status, payload, created_at, clients(id, name, full_name, address_street, address_number, address_condo, address_apt, address_city)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SavedQuote[];
}

export async function deleteQuote(id: string): Promise<void> {
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}

// ─── Save quote (upsert client by name + address) ─────────────────────────────

export async function saveQuote(budget: BudgetData, userId: string) {
  const name = budget.clientName.trim();
  if (!name) throw new Error("Informe o nome do cliente.");

  const fullName = budget.clientFullName?.trim() || null;

  // Match by name + street + city (enough to identify distinct client/location combos)
  const { data: existing, error: findErr } = await supabase
    .from("clients")
    .select("id")
    .ilike("name", name)
    .eq("address_street", budget.addressStreet || "")
    .eq("address_city", budget.addressCity || "");
  if (findErr) throw findErr;

  let clientId: string | null = null;

  if (existing && existing.length > 0) {
    clientId = existing[0].id;
    // Update full_name if we now have one (never overwrite with empty)
    if (fullName) {
      await supabase.from("clients").update({ full_name: fullName }).eq("id", clientId);
    }
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("clients")
      .insert({
        user_id: userId,
        name,
        full_name: fullName,
        address_street: budget.addressStreet || null,
        address_number: budget.addressNumber || null,
        address_condo: budget.addressCondo || null,
        address_apt: budget.addressApt || null,
        address_city: budget.addressCity || null,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    clientId = inserted.id;
  }

  const { total } = computeTotals(budget);
  const { error: qErr } = await supabase.from("quotes").insert({
    user_id: userId,
    client_id: clientId,
    payload: budget as unknown as object,
    total_value: total,
    status: "exported",
  });
  if (qErr) throw qErr;

  return { clientId };
}

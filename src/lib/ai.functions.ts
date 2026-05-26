import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({ scope: z.string().min(1).max(8000) });

export type StructuredItem = {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
};

export const structureScope = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Input.parse(input))
  .handler(async ({ data }): Promise<{ items: StructuredItem[] }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY ausente");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você é assistente de um profissional de serviços gerais e pintura no Brasil. Analise o texto bruto de escopo e retorne uma lista estruturada de itens de orçamento. Cada item deve ter uma descrição clara em português. Quantidade e valor unitário são opcionais — só preencha se estiverem explícitos no texto. Use ponto como separador decimal.",
          },
          { role: "user", content: data.scope },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_items",
              description: "Define os itens estruturados do orçamento.",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        quantity: { type: ["number", "null"] },
                        unitPrice: { type: ["number", "null"] },
                      },
                      required: ["description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["items"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_items" } },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("AI gateway error", res.status, text);
      if (res.status === 429) throw new Error("Limite de uso atingido. Tente novamente em instantes.");
      if (res.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos em Configurações.");
      throw new Error("Falha ao chamar a IA");
    }
    const json = await res.json();
    const call = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return { items: [] };
    const parsed = JSON.parse(call.function.arguments);
    const items: StructuredItem[] = (parsed.items || []).map((i: any) => ({
      description: String(i.description ?? "").trim(),
      quantity: typeof i.quantity === "number" ? i.quantity : null,
      unitPrice: typeof i.unitPrice === "number" ? i.unitPrice : null,
    }));
    return { items };
  });

import { GoogleGenerativeAI } from "@google/generative-ai";

export type StructuredItem = {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
};

export async function structureScope(scope: string): Promise<{ items: StructuredItem[] }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

  const prompt = `Você é assistente de um profissional de serviços gerais e pintura no Brasil.
Analise o texto bruto de escopo abaixo e retorne ESTRITAMENTE um JSON (sem blocos markdown, sem texto extra) com a chave "items".
Cada item deve ter:
- "descricao": string — descrição clara em português
- "quantidade": number ou null — só preencha se explícito no texto
- "valor": number ou null — valor unitário em reais com ponto decimal, só se explícito

Texto:
${scope}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  // Strip markdown fences if the model wrapped the JSON
  const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("A IA retornou um formato inesperado. Tente reformular o escopo.");
  }

  const rawItems: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as Record<string, unknown>)?.items)
      ? ((parsed as Record<string, unknown>).items as unknown[])
      : [];

  const items: StructuredItem[] = rawItems.map((i) => {
    const item = i as Record<string, unknown>;
    return {
      description: String(item.descricao ?? item.description ?? "").trim(),
      quantity:
        typeof item.quantidade === "number"
          ? item.quantidade
          : typeof item.quantity === "number"
            ? item.quantity
            : null,
      unitPrice:
        typeof item.valor === "number"
          ? item.valor
          : typeof item.unitPrice === "number"
            ? item.unitPrice
            : null,
    };
  });

  return { items };
}

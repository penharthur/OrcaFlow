import { GoogleGenerativeAI } from "@google/generative-ai";

export type StructuredItem = {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
};

export async function structureScope(
  scope: string,
): Promise<{ items: StructuredItem[]; valor_global: number | null }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Você é um assistente especialista em orçamentos de serviços gerais e obras no Brasil.
Analise o texto bruto de escopo abaixo e retorne ESTRITAMENTE um JSON válido (sem marcações markdown, sem \`\`\`json, sem texto extra) com um objeto contendo as chaves "items" e "valor_global".

Regras obrigatórias para cada item em "items":
- "descricao": string — descrição clara e profissional do serviço em português.
- "quantidade": number ou null — identifique a quantidade exata. Se o texto usar palavras como "ambas", "as duas" ou "par", converta para 2.
- "valor": number ou null — SEMPRE o valor UNITÁRIO. Se o texto informar valor total para quantidade > 1, DIVIDA pelo total de unidades. Use ponto como decimal, sem "R$".

Regra para "valor_global":
- Se o texto mencionar um valor único para TODOS os serviços juntos (ex: "tudo por 650", "valor total 800", "cobro 500 pelo serviço todo"), coloque esse valor em "valor_global" e deixe "valor" de cada item como null.
- Se os valores forem por item individual, deixe "valor_global" como null e preencha "valor" em cada item.
- "valor_global" é number ou null.

Texto bruto do escopo:
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

  const valor_global =
    typeof (parsed as Record<string, unknown>)?.valor_global === "number"
      ? ((parsed as Record<string, unknown>).valor_global as number)
      : null;

  return { items, valor_global };
}

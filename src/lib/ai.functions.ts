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
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Você é um assistente especialista em orçamentos de serviços gerais e obras no Brasil.
Analise o texto bruto de escopo abaixo e retorne ESTRITAMENTE um JSON válido (sem marcações markdown, sem \`\`\`json, sem texto extra) com um objeto contendo a chave "items".

Regras obrigatórias para cada item extraído:
- "descricao": string — descrição clara e profissional do serviço em português.
- "quantidade": number ou null — identifique a quantidade exata. Se o texto usar palavras como "ambas", "as duas" ou "par", converta a quantidade para o número 2.
- "valor": number ou null — ATENÇÃO: Este campo DEVE SER SEMPRE O VALOR UNITÁRIO do serviço. Se o texto informar um valor TOTAL para uma quantidade maior que 1 (ex: "400 reais ambas as portas"), você DEVE DIVIDIR o total pela quantidade e retornar APENAS o valor matemático unitário (ex: 200). Use apenas números com ponto para decimais, sem a sigla R$.

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

  return { items };
}

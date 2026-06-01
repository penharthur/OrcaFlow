import { GoogleGenerativeAI } from "@google/generative-ai";

export type StructuredItem = {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
};

export async function structureScope(
  scope: string,
): Promise<{ items: StructuredItem[]; valor_global: number | null; observations: string[] }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Você é um assistente especialista em orçamentos de serviços gerais e obras no Brasil.
Analise o texto bruto de escopo abaixo e retorne ESTRITAMENTE um JSON válido (sem marcações markdown, sem \`\`\`json, sem texto extra) com um objeto contendo as chaves "items", "valor_global" e "observacoes".

Regras para "items" — lista de serviços/tarefas a executar:
- "descricao": string — descrição clara e profissional em português.
- "quantidade": number ou null — identifique a quantidade (m², kg, unidades, etc.). Se usar "ambas", "as duas" ou "par", converta para 2. Se não informado, use null.
- "valor": number ou null — SEMPRE o valor UNITÁRIO. Se o texto informar valor total para quantidade > 1, DIVIDA. Use ponto como decimal, sem "R". Se for valor global único, use null.

Regra para "valor_global":
- Se o texto mencionar um valor único para TODOS os serviços juntos (ex: "tudo por 650", " 33.500,00", "R 33.500,00"), extraia esse número em "valor_global" e deixe "valor" de cada item como null.
- IMPORTANTE: ignore separadores de milhar — "33.500,00" = 33500.00, "1.200,00" = 1200.00.
- Se os valores forem por item, deixe "valor_global" como null e preencha "valor" em cada item.
- "valor_global" é number ou null.

Regras para "observacoes" — lista de notas, ressalvas e condições especiais:
- Extraia textos marcados como "Obs", "Obs:", "Obs 1", "Obs 2", "Observação", etc.
- Inclua qualquer condição especial, exigência externa, ressalva ou nota que NÃO seja um serviço a executar.
- Cada observação é uma string. Preserve o texto original (pode corrigir ortografia óbvia), sem truncar.
- Retorne array vazio [] se não houver observações.
- NÃO inclua em "observacoes": serviços executáveis, valores monetários, prazos de pagamento.

O que vai para "items": serviços manuais, mão de obra, materiais aplicados, taxas obrigatórias (ex: "Seguro da obra", "Retirada do entulho").
O que vai para "observacoes": notas explicativas, condições impostas por terceiros, ressalvas técnicas.

Texto bruto do escopo:
${scope}`
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

  const rawObs: unknown[] = Array.isArray((parsed as Record<string, unknown>)?.observacoes)
    ? ((parsed as Record<string, unknown>).observacoes as unknown[])
    : [];
  const observations: string[] = rawObs.map((o) => String(o).trim()).filter(Boolean);

  return { items, valor_global, observations };
}

/** Convert a File to base64 in chunks (avoids stack overflow on large files) */
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Send a budget PDF to Gemini and extract client name, total value and service scope.
 * The PDF is passed as inline base64 data — no extra library needed.
 */
export async function extractBudgetFromPDF(file: File): Promise<{
  payerName: string;
  value: number;
  addressCondo: string;
  addressStreet: string;
  addressNumber: string;
  addressApt: string;
  addressCity: string;
  serviceRaw: string;
}> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const base64 = await fileToBase64(file);

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "application/pdf",
        data: base64,
      },
    },
    {
      text: `Analise este orçamento em PDF e retorne ESTRITAMENTE um JSON válido (sem markdown, sem \`\`\`json, sem texto extra) com:
- "payerName": string — nome do cliente. Procure em "Aos cuidados de" ou campo similar.
- "value": number — valor total do orçamento. Use ponto como decimal. Ex: 1250.00
- "addressCondo": string — nome do condomínio, ou "" se não houver.
- "addressStreet": string — rua ou avenida, ou "" se não encontrado.
- "addressNumber": string — número do imóvel, ou "" se não encontrado.
- "addressApt": string — apartamento, ou "" se não houver.
- "addressCity": string — cidade do endereço, ou "" se não encontrado.
- "serviceRaw": string — descrição completa dos serviços/itens, listando todos os itens encontrados.

Retorne APENAS o JSON, sem nenhum texto antes ou depois.`,
    },
  ]);

  const raw = result.response.text().trim();
  const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("A IA não conseguiu ler o PDF. Verifique se é um orçamento válido.");
  }

  const p = parsed as Record<string, unknown>;
  const str = (k: string) => String(p[k] ?? "").trim();
  return {
    payerName: str("payerName"),
    value:
      typeof p.value === "number"
        ? p.value
        : parseFloat(String(p.value ?? "0").replace(",", ".")) || 0,
    addressCondo: str("addressCondo"),
    addressStreet: str("addressStreet"),
    addressNumber: str("addressNumber"),
    addressApt: str("addressApt"),
    addressCity: str("addressCity"),
    serviceRaw: str("serviceRaw"),
  };
}

export async function generateReceiptText(
  value: number,
  serviceRaw: string,
): Promise<{ serviceDescription: string; valueInWords: string }> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY não configurada.");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const formatted = value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const prompt = `Você é um assistente especialista em documentos jurídicos e financeiros no Brasil.
Com base no serviço descrito e no valor informado, retorne ESTRITAMENTE um JSON válido (sem markdown, sem \`\`\`json, sem texto extra) com:
- "serviceDescription": string — descrição profissional, concisa e formal do serviço em português, adequada para um recibo. Não repita o valor monetário. Ex: "execução de serviços de pintura interna no apartamento localizado na Rua das Flores, 123".
- "valueInWords": string — o valor ${formatted} escrito por extenso em português. Use letras minúsculas. Ex: "seiscentos e cinquenta reais".

Serviço descrito:
${serviceRaw}`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const jsonText = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error("A IA retornou um formato inesperado.");
  }

  const p = parsed as Record<string, unknown>;
  return {
    serviceDescription: String(p.serviceDescription ?? "").trim(),
    valueInWords: String(p.valueInWords ?? "").trim(),
  };
}

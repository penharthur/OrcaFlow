
# OrçaFlow v3 — Supabase + IA + DnD

Vou habilitar Lovable Cloud (Supabase + AI Gateway) e refatorar a app para suportar autenticação real, persistência de clientes/orçamentos, estruturação de escopo via IA e reordenação por arrastar.

## 1. Backend (Lovable Cloud)

- Habilitar Lovable Cloud (Supabase).
- Migração SQL:
  - `clients (id uuid pk, user_id uuid references auth.users, name text, address text, created_at timestamptz default now())`
  - `quotes (id uuid pk, user_id uuid, client_id uuid references clients, payload jsonb, total_value numeric, status text default 'draft', created_at timestamptz default now())`
  - RLS: cada usuário só vê/edita seus próprios registros (`auth.uid() = user_id`).
- Server function `structure-scope` (createServerFn) chamando Lovable AI Gateway (`google/gemini-3-flash-preview`) com tool-calling para retornar `{ items: [{description, quantity?, unitPrice?}] }`.

## 2. Auth

- Substituir mock por Supabase Auth (email/senha).
- `/login` com tabs Entrar / Cadastrar (`signInWithPassword`, `signUp` com `emailRedirectTo`).
- `__root.tsx` registra `onAuthStateChange` e invalida queries.
- `/` protegido: redireciona para `/login` se não autenticado.

## 3. Formulário (esquerda)

- Header "AOS CUIDADOS DE", "ENDEREÇO", "DATA" com labels `font-semibold text-slate-800`.
- Campo "Aos cuidados de" com Combobox/Command: debounce buscando `clients` do usuário; ao selecionar, preenche `address`.
- **Escopo Bruto**: Textarea grande + botão "✨ Estruturar Orçamento (IA)" que chama a server function e substitui `items[]`.
- Lista de serviços resultante:
  - Cards reordenáveis via `@dnd-kit/core` + `@dnd-kit/sortable` (handle de arrastar).
  - Cada item: descrição (textarea), qty/valor un. opcionais, remover.
  - Botão "Adicionar item manual".
- Footer financeiro: inputs `Acréscimo (R$)` e `Desconto (R$)`. Total = subtotal + acréscimo − desconto (manualTotal removido em favor de cálculo).
- Inputs Telefone/WhatsApp + E-mail.

## 4. Preview A4 (direita)

- Fundo: `background-image: url(...)` cover/center + overlay `bg-white/70` absoluto para marca-d'água legível.
- Tabela renderiza ordem do array (refletindo DnD).
- Total = subtotal + acréscimo − desconto.
- Rodapé:
  - Lateral esquerda: ícones Phone/Mail + dados dinâmicos.
  - Centro: linha preta sólida, "Luis Fernando Dias Penha" em fonte serifada (Instrument Serif), e-mail abaixo.
- Remover qualquer canvas/desenho livre (não havia, manter limpo).

## 5. Exportar PDF + salvar

Botão "Exportar PDF":
1. Gera PDF com html2pdf.
2. Resolve cliente: busca `clients` do user com `name` igual (case-insensitive).
   - Se não existe → insert novo.
   - Se existe mas `address` difere → insert novo (histórico).
   - Senão → reutiliza.
3. Insere em `quotes` com `client_id`, `total_value`, `payload` (snapshot completo).
4. Toast de sucesso.

## 6. Detalhes técnicos

- Deps novas: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`.
- `budget-store.ts`: tipo passa a incluir `discount`, `surcharge`, `items` com `id` estável (uuid local) para DnD; remove `manualTotal`.
- Server fn em `src/lib/ai.functions.ts` usando `requireSupabaseAuth` para evitar abuso.
- Auto-save local mantém rascunho em localStorage como hoje.

## Arquivos afetados

- novo: migração SQL, `src/lib/ai.functions.ts`, `src/lib/quotes.ts`, `src/components/budget/SortableItem.tsx`, `src/components/budget/ClientCombobox.tsx`
- editado: `src/lib/budget-store.ts`, `src/routes/login.tsx`, `src/routes/index.tsx`, `src/routes/__root.tsx`, `src/components/budget/BudgetForm.tsx`, `src/components/budget/BudgetPreview.tsx`, `src/start.ts` (attachSupabaseAuth)

Após aprovação, executo tudo de uma vez.

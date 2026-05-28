<div align="right">

[🇧🇷 Português](./README.md) | [🇺🇸 English](./README.en.md)

</div>

<div align="center">

# OrçaFlow

**Geração profissional de orçamentos e recibos — diretamente do navegador.**

Gere PDFs em formato A4 para orçamentos e recibos, gerencie o histórico de clientes e deixe a IA estruturar sua descrição de serviços em uma tabela organizada de itens.

<br />

![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

</div>

---

## Visão Geral

OrçaFlow é uma aplicação web desenvolvida para freelancers e pequenas empresas de serviços no Brasil. Substitui a edição manual de documentos por um formulário com pré-visualização em tempo real, renderizando instantaneamente o orçamento ou recibo em formato A4 — pronto para imprimir ou salvar como PDF.

A aplicação é uma SPA (Single-Page Application) com o Supabase gerenciando autenticação, armazenamento de arquivos e um banco de dados relacional para o histórico de clientes e documentos. A geração de PDF utiliza a API nativa `window.print()` do navegador, evitando os problemas de fidelidade de cores comuns em bibliotecas baseadas em canvas.

---

## Funcionalidades

### 📄 Orçamento
- Formulário estruturado de cliente com campos de endereço: **Condomínio, Rua, Número, Apartamento, Cidade**
- **Estruturação de escopo por IA** — cole descrições brutas de serviços e o Gemini 2.5 Flash retorna itens organizados com quantidades e preços unitários
- Reordenação de itens por **arrastar e soltar** via DnD Kit
- **Override global de valor** para trabalhos com preço fechado (ignora o cálculo por item)
- **Seletor inteligente de condições** — escolha entre "A combinar", divisão percentual (ex: 50% na entrada / 50% na entrega) ou prazo em dias (úteis ou corridos), com inputs editáveis
- Toggle de inclusão de materiais, campos de acréscimo e desconto
- **Imagem de fundo** — faça upload de uma imagem de cabeçalho/timbrado; sincroniza com o Supabase Storage para acesso entre dispositivos
- Pré-visualização A4 ao vivo com total fidelidade de impressão

### 🧾 Recibo
- Compartilha **nome e endereço do cliente** com o orçamento ativo — editar em uma aba atualiza a outra
- **Descrição gerada automaticamente** — "referente a serviços realizados em [endereço]" construída a partir dos campos estruturados
- **Modo de descrição personalizada** para texto de serviço manual
- **Valor por extenso** calculado automaticamente em Português do Brasil (ex: *mil e duzentos e cinquenta reais e cinquenta centavos*) — com override editável
- Botão para **copiar o total do orçamento** para o valor do recibo com um clique
- Nome do recebedor e informações de contato no rodapé

### 🗂️ Histórico
- Cada orçamento e recibo exportado é salvo automaticamente no Supabase
- Histórico completo com nome do cliente, data e valor
- **Reabrir** qualquer documento anterior — restaura todos os campos do formulário exatamente como foram exportados
- Exclusão de registros individuais com confirmação

### 🔍 Autocomplete de Clientes
- Digite o nome de um cliente e os já salvos aparecem em um dropdown
- Ao selecionar, **preenche todos os campos de endereço** a partir do registro armazenado
- Armazena **nome curto** (para o cabeçalho do orçamento) e **nome completo** (para o corpo do recibo)

### 📱 Totalmente Responsivo
- Otimizado para mobile — testado no Samsung Galaxy S24
- Pré-visualização A4 responsiva escala para qualquer tela via `transform + margin` negativa (sem zoom — seguro para impressão)
- Cabeçalho mobile colapsa ações secundárias em um menu dropdown
- `window.print()` funciona nativamente no Android Chrome e iOS Safari

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 7 |
| Roteamento | TanStack Router v1 (baseado em arquivos) |
| Estilização | Tailwind CSS v4 + shadcn/ui |
| Auth & Banco de Dados | Supabase (PostgreSQL + RLS) |
| Armazenamento | Supabase Storage |
| IA | Google Gemini 2.5 Flash (client-side) |
| Arrastar e Soltar | DnD Kit |
| Datas | date-fns (locale pt-BR) |
| Notificações | Sonner |
| Ícones | Lucide React |

---

## Como Funciona

### Exportação de PDF
OrçaFlow usa `window.print()` em vez de canvas ou bibliotecas headless. Isso preserva as cores `oklch` do Tailwind (que o html2canvas não consegue renderizar), garante uma saída A4 pixel-perfect e funciona perfeitamente no mobile.

O CSS de impressão isola o elemento `.a4-sheet`:
```css
@media print {
  body * { visibility: hidden; }
  .a4-sheet, .a4-sheet * { visibility: visible; }
}
```

### Estruturação de Escopo por IA
O usuário cola uma descrição bruta de serviço (ex: *"2 paredes de pintura ~25m², rodapé danificado, troca tomada cozinha R$80"*). Isso é enviado ao Gemini 2.5 Flash, que retorna JSON estruturado: descrições de serviços, quantidades, preços unitários e um valor global opcional. O formulário é atualizado instantaneamente.

### Escalonamento Responsivo da Pré-visualização
A pré-visualização A4 (794 × 1123 px) escala para qualquer viewport usando CSS `transform: scale()` com margens negativas compensatórias — assim o footprint do container coincide com o tamanho visual. O bloco de impressão redefine ambos para zero, garantindo que o documento sempre imprima em tamanho completo, independente do zoom atual.

```css
.preview-scale-inner {
  transform: scale(0.44);                          /* celular */
  margin-inline: calc((0.44 - 1) / 2 * 210mm);   /* colapso horizontal */
  margin-bottom: calc((0.44 - 1) * 297mm);        /* colapso vertical   */
}
```

### Sincronização de Imagem de Fundo entre Dispositivos
As imagens de fundo são enviadas ao Supabase Storage. A URL pública é armazenada no `user_metadata` do usuário. Ao fazer login em qualquer dispositivo, se nenhum fundo local estiver em cache, a URL armazenada é restaurada automaticamente.

---

## Começando

### Pré-requisitos
- Node.js 18+
- Um projeto no [Supabase](https://supabase.com)
- Uma chave de API do [Google AI Studio](https://aistudio.google.com) (Gemini)

### Instalação

```bash
git clone https://github.com/penharthur/orcaflow.git
cd orcaflow
npm install
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_GEMINI_API_KEY=sua-gemini-api-key
```

### Configuração do Banco de Dados

Execute o seguinte no **SQL Editor** do Supabase:

```sql
-- Clientes
create table clients (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null,
  full_name     text,
  address_street text,
  address_number text,
  address_condo  text,
  address_apt    text,
  address_city   text,
  created_at    timestamptz default now()
);
alter table clients enable row level security;
create policy "clients_owner" on clients
  for all using (auth.uid() = user_id);

-- Orçamentos
create table quotes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  client_id    uuid references clients(id),
  payload      jsonb,
  total_value  numeric(12, 2),
  status       text default 'exported',
  created_at   timestamptz default now()
);
alter table quotes enable row level security;
create policy "quotes_owner" on quotes
  for all using (auth.uid() = user_id);

-- Recibos
create table receipts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  payer_name    text,
  receiver_name text,
  value         numeric(12, 2),
  payload       jsonb,
  created_at    timestamptz default now()
);
alter table receipts enable row level security;
create policy "receipts_owner" on receipts
  for all using (auth.uid() = user_id);
```

Crie também um **bucket de Storage** chamado `backgrounds` e configure-o como **público**.

### Executando Localmente

```bash
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173) e crie uma conta.

---

## Estrutura do Projeto

```
src/
├── components/
│   ├── budget/
│   │   ├── BudgetForm.tsx       # Formulário completo com gatilho de IA
│   │   ├── BudgetPreview.tsx    # Pré-visualização A4 ao vivo
│   │   ├── ClientCombobox.tsx   # Autocomplete com histórico de clientes
│   │   ├── SortableItem.tsx     # Item de linha com arrastar e soltar
│   │   └── TermsSelect.tsx      # Seletor de condições de pagamento/execução
│   ├── receipt/
│   │   ├── ReceiptForm.tsx      # Formulário de recibo (compartilha dados com orçamento)
│   │   └── ReceiptPreview.tsx   # Pré-visualização A4 do recibo
│   └── ui/                      # Componentes shadcn/ui
├── lib/
│   ├── budget-store.ts          # Tipo BudgetData, hooks, número por extenso, buildAddress
│   ├── receipt-store.ts         # Tipo ReceiptData e hook
│   ├── quotes.ts                # CRUD Supabase para orçamentos + clientes
│   ├── receipts.ts              # CRUD Supabase para recibos
│   └── ai.functions.ts          # Chamadas à API Gemini (estruturação de escopo)
├── routes/
│   ├── __root.tsx               # Layout raiz + QueryClientProvider
│   ├── index.tsx                # Dashboard principal (abas Orçamento / Recibo)
│   ├── admin.tsx                # Página de histórico
│   └── login.tsx                # Autenticação (entrar / criar conta)
└── styles.css                   # Estilos globais, a4-sheet, escalonamento de pré-visualização
```

---

## Licença

MIT © [Arthur Penha](https://github.com/penharthur)

<div align="center">

# OrçaFlow

**Professional budget and receipt generation — straight from the browser.**

Generate A4-ready PDFs for budgets and receipts, manage your client history, and let AI structure your raw service scope into a clean line-item table.

<br />

![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white)

</div>

---

## Overview

OrçaFlow is a web application designed for freelancers and small service businesses in Brazil. It replaces manual document editing with a live-preview form that instantly renders an A4-formatted budget or receipt — ready to print or save as PDF.

The application is built as a single-page app with Supabase handling authentication, file storage, and a relational database for client and document history. All PDF generation uses the browser's native `window.print()` API, avoiding the color fidelity issues common in canvas-based PDF libraries.

---

## Features

### 📄 Budget (Orçamento)
- Structured client form with **Condominium, Street, Number, Apartment, City** address fields
- **AI scope structuring** — paste raw service descriptions and Gemini 2.5 Flash returns clean line items with quantities and unit prices
- Drag-and-drop item reordering via **DnD Kit**
- **Global value override** for fixed-price jobs (bypasses per-item calculation)
- Smart **payment terms selector** — choose between "A combinar", percentage split (e.g. 50% upfront / 50% on delivery), or fixed-day terms (business or calendar days), with editable inputs
- Material inclusion toggle, surcharge and discount fields
- **Background image** — upload a branded header/letterhead image; syncs to Supabase Storage for cross-device access
- Live A4 preview with full print fidelity

### 🧾 Receipt (Recibo)
- Shares **client name and address** with the active budget — editing in one tab updates the other
- **Auto-generated description** — "referente a serviços realizados em [address]" built from the structured fields
- **Custom description mode** for manual service text
- **Value in words** auto-computed in Brazilian Portuguese (e.g. *mil e duzentos e cinquenta reais e cinquenta centavos*) — fully editable override
- One-click **copy total from budget** to receipt value
- Receiver name and contact info in the footer

### 🗂️ History (Histórico)
- Every exported budget and receipt is automatically saved to Supabase
- Full history with client name, date, and value
- **Reopen** any past document — restores all form fields exactly as exported
- Delete individual records with confirmation

### 🔍 Client Autocomplete
- Type a client name and previously saved clients appear in a dropdown
- Selecting a client **fills all address fields** from the stored record
- Stores both a **short name** (for budget header) and **full legal name** (for receipt body)

### 📱 Fully Responsive
- Optimized for mobile — tested on Samsung Galaxy S24
- Responsive A4 preview scales to fit any screen via CSS `transform + margin` technique (no zoom — print-safe)
- Mobile header collapses secondary actions into a dropdown menu
- `window.print()` works natively on Android Chrome and iOS Safari

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 7 |
| Routing | TanStack Router v1 (file-based) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Auth & Database | Supabase (PostgreSQL + RLS) |
| File Storage | Supabase Storage |
| AI | Google Gemini 2.5 Flash (client-side) |
| Drag & Drop | DnD Kit |
| Date handling | date-fns (pt-BR locale) |
| Toasts | Sonner |
| Icons | Lucide React |

---

## How It Works

### PDF Export
OrçaFlow uses `window.print()` instead of canvas or headless browser libraries. This preserves Tailwind's `oklch` colors (which html2canvas cannot render), gives pixel-perfect A4 output, and works seamlessly on mobile.

The print CSS isolates the `.a4-sheet` element:
```css
@media print {
  body * { visibility: hidden; }
  .a4-sheet, .a4-sheet * { visibility: visible; }
}
```

### AI Scope Structuring
The user pastes a raw service description (e.g. *"2 paredes de pintura ~25m², rodapé danificado, troca tomada cozinha R$80"*). This is sent to Gemini 2.5 Flash, which returns structured JSON: service descriptions, quantities, unit prices, and an optional global value. The form updates instantly.

### Responsive Preview Scaling
The A4 preview (794 × 1123 px) scales to fit any viewport using CSS `transform: scale()` with compensating negative margins — so the container footprint matches the visual size exactly. The print block resets both to zero so the document always prints at full size regardless of the current zoom level.

```css
.preview-scale-inner {
  transform: scale(0.44);                          /* phone */
  margin-inline: calc((0.44 - 1) / 2 * 210mm);   /* collapse horizontal space */
  margin-bottom: calc((0.44 - 1) * 297mm);        /* collapse vertical space   */
}
```

### Cross-Device Background Sync
Background images are uploaded to Supabase Storage. The public URL is stored in the user's `user_metadata`. On login from any device, if no local background is cached, the stored URL is restored automatically.

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### Installation

```bash
git clone https://github.com/penharthur/orcaflow.git
cd orcaflow
npm install
```

### Environment Variables

Create a `.env` file at the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GEMINI_API_KEY=your-gemini-api-key
```

### Database Setup

Run the following in your Supabase **SQL Editor**:

```sql
-- Clients
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

-- Quotes (budgets)
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

-- Receipts
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

Also create a **Storage bucket** named `backgrounds` and set it to **public**.

### Running Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and create an account.

---

## Project Structure

```
src/
├── components/
│   ├── budget/
│   │   ├── BudgetForm.tsx       # Full budget form with AI trigger
│   │   ├── BudgetPreview.tsx    # A4 live preview
│   │   ├── ClientCombobox.tsx   # Autocomplete with client history
│   │   ├── SortableItem.tsx     # Drag-and-drop line item
│   │   └── TermsSelect.tsx      # Payment / execution terms selector
│   ├── receipt/
│   │   ├── ReceiptForm.tsx      # Receipt form (shares client data with budget)
│   │   └── ReceiptPreview.tsx   # A4 receipt preview
│   └── ui/                      # shadcn/ui components
├── lib/
│   ├── budget-store.ts          # BudgetData type, hooks, number-to-words, buildAddress
│   ├── receipt-store.ts         # ReceiptData type and hook
│   ├── quotes.ts                # Supabase CRUD for budgets + clients
│   ├── receipts.ts              # Supabase CRUD for receipts
│   └── ai.functions.ts          # Gemini API calls (scope structuring, PDF reading)
├── routes/
│   ├── __root.tsx               # Root layout + QueryClientProvider
│   ├── index.tsx                # Main dashboard (Budget / Receipt tabs)
│   ├── admin.tsx                # History page
│   └── login.tsx                # Auth (sign in / sign up)
└── styles.css                   # Global styles, a4-sheet, preview scaling
```

---

## License

MIT © [Arthur Penha](https://github.com/penharthur)

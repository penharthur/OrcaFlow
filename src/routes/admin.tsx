import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Trash2,
  FolderOpen,
  Loader2,
  FileText,
  Receipt,
  CalendarDays,
  User,
  Banknote,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatBRL } from "@/lib/budget-store";
import { supabase } from "@/integrations/supabase/client";
import { getQuotes, deleteQuote, type SavedQuote } from "@/lib/quotes";
import { getReceipts, deleteReceipt, type SavedReceipt } from "@/lib/receipts";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({ meta: [{ title: "OrçaFlow — Histórico" }] }),
});

type AdminTab = "budgets" | "receipts";

function AdminPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>("budgets");
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [receipts, setReceipts] = useState<SavedReceipt[]>([]);
  const [loading, setLoading] = useState(false);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: userData, error }) => {
      if (error || !userData.user) {
        navigate({ to: "/login", replace: true });
      } else {
        setUserId(userData.user.id);
      }
      setChecking(false);
    });
  }, [navigate]);

  // Load data once authenticated
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([getQuotes(userId), getReceipts(userId)])
      .then(([q, r]) => {
        setQuotes(q);
        setReceipts(r);
      })
      .catch((e: unknown) =>
        toast.error(`Erro ao carregar dados: ${e instanceof Error ? e.message : String(e)}`),
      )
      .finally(() => setLoading(false));
  }, [userId]);

  const handleDeleteQuote = (id: string) => {
    toast("Excluir orçamento?", {
      description: "Essa ação não pode ser desfeita.",
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            await deleteQuote(id);
            setQuotes((prev) => prev.filter((x) => x.id !== id));
            toast.success("Orçamento excluído.");
          } catch (e: unknown) {
            toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  };

  const handleDeleteReceipt = (id: string) => {
    toast("Excluir recibo?", {
      description: "Essa ação não pode ser desfeita.",
      action: {
        label: "Excluir",
        onClick: async () => {
          try {
            await deleteReceipt(id);
            setReceipts((prev) => prev.filter((x) => x.id !== id));
            toast.success("Recibo excluído.");
          } catch (e: unknown) {
            toast.error(`Erro: ${e instanceof Error ? e.message : String(e)}`);
          }
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  };

  /** Write budget payload to localStorage and go back to dashboard on budget tab */
  const reopenQuote = (quote: SavedQuote) => {
    try {
      localStorage.setItem("budget:data", JSON.stringify(quote.payload));
      navigate({ to: "/", search: { tab: "budget" } });
    } catch {
      toast.error("Não foi possível reabrir o orçamento.");
    }
  };

  /** Write receipt + budget payloads to localStorage and go back to dashboard on receipt tab */
  const reopenReceipt = (receipt: SavedReceipt) => {
    try {
      const { budgetData, ...receiptData } = receipt.payload as SavedReceipt["payload"] & {
        budgetData?: unknown;
      };
      localStorage.setItem("receipt:data", JSON.stringify(receiptData));
      if (budgetData) localStorage.setItem("budget:data", JSON.stringify(budgetData));
      navigate({ to: "/", search: { tab: "receipt" } });
    } catch {
      toast.error("Não foi possível reabrir o recibo.");
    }
  };

  if (checking || !userId) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 lg:px-6 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ to: "/" })}
            title="Voltar"
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl leading-none">Histórico</h1>
            <p className="text-xs text-muted-foreground hidden sm:block">Orçamentos e recibos exportados</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        {/* Tab switcher — full-width on mobile, auto-width on desktop */}
        <div className="flex items-center border rounded-lg overflow-hidden text-sm mb-6 lg:mb-8 sm:w-fit">
          <button
            onClick={() => setActiveTab("budgets")}
            className={cn(
              "flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-2 transition-colors flex items-center justify-center gap-2 font-medium",
              activeTab === "budgets"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground",
            )}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span>Orçamentos</span>
            {quotes.length > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  activeTab === "budgets"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {quotes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("receipts")}
            className={cn(
              "flex-1 sm:flex-none px-4 sm:px-5 py-2.5 sm:py-2 transition-colors border-l flex items-center justify-center gap-2 font-medium",
              activeTab === "receipts"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground",
            )}
          >
            <Receipt className="h-4 w-4 shrink-0" />
            <span>Recibos</span>
            {receipts.length > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  activeTab === "receipts"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {receipts.length}
              </span>
            )}
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        )}

        {/* Lists */}
        {!loading && activeTab === "budgets" && (
          <QuoteList quotes={quotes} onDelete={handleDeleteQuote} onReopen={reopenQuote} />
        )}
        {!loading && activeTab === "receipts" && (
          <ReceiptList
            receipts={receipts}
            onDelete={handleDeleteReceipt}
            onReopen={reopenReceipt}
          />
        )}
      </main>
    </div>
  );
}

// ─── Quote list ───────────────────────────────────────────────────────────────

function QuoteList({
  quotes,
  onDelete,
  onReopen,
}: {
  quotes: SavedQuote[];
  onDelete: (id: string) => void;
  onReopen: (q: SavedQuote) => void;
}) {
  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-10 w-10 opacity-25" />}
        title="Nenhum orçamento salvo"
        subtitle="Exporte um orçamento para que ele apareça aqui."
      />
    );
  }

  return (
    <div className="space-y-3">
      {quotes.map((q) => {
        const clientName =
          q.clients?.name ||
          (q.payload as { clientName?: string })?.clientName ||
          "Cliente não identificado";
        const dateStr = format(new Date(q.created_at), "dd/MM/yyyy 'às' HH:mm", {
          locale: ptBR,
        });
        const value = q.total_value != null && q.total_value > 0 ? formatBRL(q.total_value) : null;

        return (
          <RecordCard
            key={q.id}
            title={clientName}
            date={dateStr}
            value={value}
            onReopen={() => onReopen(q)}
            onDelete={() => onDelete(q.id)}
          />
        );
      })}
    </div>
  );
}

// ─── Receipt list ─────────────────────────────────────────────────────────────

function ReceiptList({
  receipts,
  onDelete,
  onReopen,
}: {
  receipts: SavedReceipt[];
  onDelete: (id: string) => void;
  onReopen: (r: SavedReceipt) => void;
}) {
  if (receipts.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-10 w-10 opacity-25" />}
        title="Nenhum recibo salvo"
        subtitle="Exporte um recibo para que ele apareça aqui."
      />
    );
  }

  return (
    <div className="space-y-3">
      {receipts.map((r) => {
        const dateStr = format(new Date(r.created_at), "dd/MM/yyyy 'às' HH:mm", {
          locale: ptBR,
        });
        const value = r.value != null && r.value > 0 ? formatBRL(r.value) : null;
        const subtitle = [r.receiver_name, r.payer_name]
          .filter(Boolean)
          .join(" → ") || undefined;

        return (
          <RecordCard
            key={r.id}
            title={r.payer_name || "Pagador não identificado"}
            subtitle={subtitle}
            date={dateStr}
            value={value}
            onReopen={() => onReopen(r)}
            onDelete={() => onDelete(r.id)}
          />
        );
      })}
    </div>
  );
}

// ─── Shared card ──────────────────────────────────────────────────────────────

function RecordCard({
  title,
  subtitle,
  date,
  value,
  onReopen,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  date: string;
  value: string | null;
  onReopen: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border bg-card px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title row */}
        <div className="flex items-center gap-2 min-w-0">
          <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="font-medium text-sm truncate">{title}</p>
        </div>

        {/* Receiver → Payer (receipts only) */}
        {subtitle && (
          <p className="text-xs text-muted-foreground pl-[22px] truncate">{subtitle}</p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-4 pl-[22px] pt-0.5">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarDays className="h-3 w-3" />
            {date}
          </span>
          {value && (
            <span className="flex items-center gap-1 text-xs font-semibold text-primary">
              <Banknote className="h-3 w-3" />
              {value}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Button variant="outline" size="sm" onClick={onReopen} className="h-9 w-9 sm:w-auto sm:px-3">
          <FolderOpen className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline text-xs">Reabrir</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Excluir"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground text-center">
      <div className="mb-4">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs mt-1 max-w-xs">{subtitle}</p>
    </div>
  );
}

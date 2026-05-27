import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, LogOut, Loader2, Trash2, History, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { BudgetPreview } from "@/components/budget/BudgetPreview";
import { ReceiptForm } from "@/components/receipt/ReceiptForm";
import { ReceiptPreview } from "@/components/receipt/ReceiptPreview";
import { useBackground, useBudget, defaultBudget } from "@/lib/budget-store";
import { useReceipt, defaultReceipt } from "@/lib/receipt-store";
import { supabase } from "@/integrations/supabase/client";
import { saveQuote } from "@/lib/quotes";
import { saveReceipt } from "@/lib/receipts";

type Tab = "budget" | "receipt";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { tab: Tab } => ({
    tab: s.tab === "receipt" ? "receipt" : "budget",
  }),
  component: Dashboard,
  head: () => ({ meta: [{ title: "OrçaFlow — Orçamentos" }] }),
});

function Dashboard() {
  const navigate = useNavigate();
  const { tab: searchTab } = Route.useSearch();

  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(searchTab ?? "budget");

  const [data, setData] = useBudget();
  const [receiptData, setReceiptData] = useReceipt();
  const [background, setBackground] = useBackground();

  const previewRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const backgroundRestoredRef = useRef(false);

  const handleBackgroundUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setBackground(reader.result as string);
    reader.readAsDataURL(file);

    if (!userId) return;
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/background.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("backgrounds")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("backgrounds").getPublicUrl(path);
      await supabase.auth.updateUser({ data: { backgroundUrl: urlData.publicUrl } });
    } catch (e) {
      console.warn("Background sync to Supabase failed:", e);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login", replace: true });
      else setUserId(session.user.id);
    });

    supabase.auth.getUser().then(({ data: userData, error }) => {
      if (error || !userData.user) {
        navigate({ to: "/login", replace: true });
      } else {
        setUserId(userData.user.id);
        const meta = userData.user.user_metadata as Record<string, string> | undefined;

        setData((d) => ({
          ...d,
          professionalName: d.professionalName || meta?.name || "",
          contactEmail: d.contactEmail || userData.user.email || "",
          contactPhone: d.contactPhone || meta?.phone || "",
        }));

        setReceiptData((d) => ({
          ...d,
          receiverName: d.receiverName || meta?.name || "",
          contactEmail: d.contactEmail || (userData.user.email ?? "") || "",
          contactPhone: d.contactPhone || meta?.phone || "",
        }));

        if (!backgroundRestoredRef.current && meta?.backgroundUrl) {
          backgroundRestoredRef.current = true;
          setBackground((prev: string | null) => prev ?? meta.backgroundUrl);
        }
      }
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate, setData, setReceiptData]);

  const clearAll = () => {
    toast("Limpar tudo?", {
      description:
        "Orçamento e recibo serão reiniciados. Dados do profissional e cidade são preservados.",
      action: {
        label: "Limpar tudo",
        onClick: () => {
          setData((d) => ({
            ...defaultBudget(),
            city: d.city,
            addressCity: d.addressCity,
            professionalName: d.professionalName,
            contactEmail: d.contactEmail,
            contactPhone: d.contactPhone,
          }));
          setReceiptData((d) => ({
            ...defaultReceipt(),
            city: d.city,
            receiverName: d.receiverName,
            contactEmail: d.contactEmail,
            contactPhone: d.contactPhone,
          }));
          toast.success("Formulários limpos.");
        },
      },
      cancel: { label: "Cancelar", onClick: () => {} },
    });
  };

  const exportPdf = async () => {
    if (!userId) return;
    setExporting(true);
    const originalTitle = document.title;

    if (activeTab === "budget") {
      const clientName = data.clientName.trim() || "cliente";
      document.title = `Orçamento de ${clientName}`;
      try {
        window.print();
        try {
          await saveQuote(data, userId);
          toast.success("Orçamento exportado e salvo!");
        } catch (e: unknown) {
          toast.error(`Falha ao salvar no banco: ${e instanceof Error ? e.message : e}`);
        }
      } catch {
        toast.error("Erro ao processar a impressão.");
      } finally {
        document.title = originalTitle;
        setExporting(false);
      }
    } else {
      const payerName = data.clientName.trim() || "cliente";
      document.title = `Recibo de ${payerName}`;
      try {
        window.print();
        try {
          await saveReceipt(receiptData, data, userId);
          toast.success("Recibo exportado e salvo!");
        } catch (e: unknown) {
          toast.error(`Falha ao salvar recibo: ${e instanceof Error ? e.message : e}`);
        }
      } catch {
        toast.error("Erro ao processar a impressão.");
      } finally {
        document.title = originalTitle;
        setExporting(false);
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  if (checking || !userId) return null;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      <style>
        {`
          @media print {
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            @page { margin: 0mm; }
          }
        `}
      </style>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b print:hidden">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-6">

          {/* Top row — logo + actions */}
          <div className="flex items-center justify-between gap-3 py-3">

            {/* Logo */}
            <div className="shrink-0 min-w-0">
              <h1 className="font-serif text-xl leading-none">OrçaFlow</h1>
              <p className="hidden sm:block text-xs text-muted-foreground truncate max-w-[180px]">
                {data.professionalName || "Orçamentos profissionais"}
              </p>
            </div>

            {/* Tab switcher — desktop only (mobile is the row below) */}
            <div className="hidden sm:flex items-center border rounded-lg overflow-hidden text-sm shrink-0">
              <button
                onClick={() => setActiveTab("budget")}
                className={cn(
                  "px-4 py-1.5 transition-colors font-medium",
                  activeTab === "budget"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground",
                )}
              >
                Orçamento
              </button>
              <button
                onClick={() => setActiveTab("receipt")}
                className={cn(
                  "px-4 py-1.5 transition-colors border-l font-medium",
                  activeTab === "receipt"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground",
                )}
              >
                Recibo
              </button>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Export PDF — always visible, label hidden on smallest screens */}
              <Button
                onClick={exportPdf}
                disabled={exporting}
                size="sm"
                className="h-9 px-3 sm:px-4"
              >
                {exporting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="ml-1.5 hidden min-[400px]:inline text-sm">Exportar PDF</span>
              </Button>

              {/* Desktop secondary actions */}
              <div className="hidden md:flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate({ to: "/admin" })}
                  className="h-9"
                >
                  <History className="h-4 w-4 mr-1.5" />
                  Histórico
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="h-9">
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  Limpar
                </Button>
                <Button variant="ghost" size="icon" onClick={logout} title="Sair" className="h-9 w-9">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>

              {/* Mobile/tablet overflow menu */}
              <div className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                      <History className="h-4 w-4 mr-2" />
                      Histórico
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={clearAll}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Limpar tudo
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Mobile tab switcher — second row (hidden on sm+) */}
          <div className="sm:hidden pb-3">
            <div className="flex items-center border rounded-lg overflow-hidden text-sm">
              <button
                onClick={() => setActiveTab("budget")}
                className={cn(
                  "flex-1 py-2.5 text-center font-medium transition-colors",
                  activeTab === "budget"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground",
                )}
              >
                Orçamento
              </button>
              <button
                onClick={() => setActiveTab("receipt")}
                className={cn(
                  "flex-1 py-2.5 text-center font-medium transition-colors border-l",
                  activeTab === "receipt"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent text-muted-foreground",
                )}
              >
                Recibo
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-4 lg:px-6 py-4 lg:py-6 lg:grid lg:grid-cols-[420px_1fr] lg:gap-6 print:block print:p-0">

        {/* Form panel — sticky sidebar on desktop, plain on mobile */}
        <aside className="lg:sticky lg:top-[72px] lg:self-start lg:max-h-[calc(100vh-88px)] lg:overflow-y-auto lg:pr-2 print:hidden">
          {activeTab === "budget" ? (
            <BudgetForm
              data={data}
              setData={setData}
              background={background}
              setBackground={setBackground}
              onUpload={handleBackgroundUpload}
            />
          ) : (
            <ReceiptForm
              data={receiptData}
              setData={setReceiptData}
              budgetData={data}
              setBudgetData={setData}
            />
          )}
        </aside>

        {/* Preview panel */}
        <section className="mt-8 lg:mt-0 overflow-x-auto print:block print:overflow-visible">
          {/* Mobile section label */}
          <p className="lg:hidden text-[10px] uppercase tracking-widest font-semibold text-muted-foreground text-center mb-4">
            Pré-visualização
          </p>

          {/* The preview-scale-inner class handles responsive scaling via styles.css */}
          <div className="flex justify-center">
            <div className="preview-scale-inner">
              {activeTab === "budget" ? (
                <BudgetPreview ref={previewRef} data={data} background={background} />
              ) : (
                <ReceiptPreview
                  ref={receiptRef}
                  data={receiptData}
                  budgetData={data}
                  background={background}
                />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

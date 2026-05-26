import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, LogOut, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { BudgetPreview } from "@/components/budget/BudgetPreview";
import { ReceiptForm } from "@/components/receipt/ReceiptForm";
import { ReceiptPreview } from "@/components/receipt/ReceiptPreview";
import { useBackground, useBudget, defaultBudget } from "@/lib/budget-store";
import { useReceipt, defaultReceipt } from "@/lib/receipt-store";
import { supabase } from "@/integrations/supabase/client";
import { saveQuote } from "@/lib/quotes";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "OrçaFlow — Orçamentos" }] }),
});

type Tab = "budget" | "receipt";

function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("budget");

  const [data, setData] = useBudget();
  const [receiptData, setReceiptData] = useReceipt();
  const [background, setBackground] = useBackground();

  const previewRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  // Prevent restoring background more than once per session
  const backgroundRestoredRef = useRef(false);

  /** Upload background file: immediate local preview + async Supabase Storage sync */
  const handleBackgroundUpload = async (file: File) => {
    // 1. Immediate local preview
    const reader = new FileReader();
    reader.onload = () => setBackground(reader.result as string);
    reader.readAsDataURL(file);

    // 2. Sync to Supabase Storage (best-effort)
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
      // Storage sync failure is non-fatal — local preview still works
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

        // Pre-fill budget professional fields (only when blank)
        setData((d) => ({
          ...d,
          professionalName: d.professionalName || meta?.name || "",
          contactEmail: d.contactEmail || userData.user.email || "",
          contactPhone: d.contactPhone || meta?.phone || "",
        }));

        // Pre-fill receipt fields (only when blank)
        setReceiptData((d) => ({
          ...d,
          receiverName: d.receiverName || meta?.name || "",
          contactEmail: d.contactEmail || (userData.user.email ?? "") || "",
          contactPhone: d.contactPhone || meta?.phone || "",
        }));

        // Restore background from Supabase if not in localStorage (cross-device sync)
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
      description: "Orçamento e recibo serão reiniciados. Dados do profissional e cidade são preservados.",
      action: {
        label: "Limpar tudo",
        onClick: () => {
          setData((d) => ({
            ...defaultBudget(),
            // Keep professional identity + preferred cities
            city: d.city,
            addressCity: d.addressCity,
            professionalName: d.professionalName,
            contactEmail: d.contactEmail,
            contactPhone: d.contactPhone,
          }));
          setReceiptData((d) => ({
            ...defaultReceipt(),
            // Keep professional identity + preferred city
            city: d.city,
            receiverName: d.receiverName,
            contactEmail: d.contactEmail,
            contactPhone: d.contactPhone,
          }));
          toast.success("Formulários limpos.");
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
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
          toast.success("Orçamento salvo com sucesso!");
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
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              margin: 0mm;
            }
          }
        `}
      </style>

      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b print:hidden">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="shrink-0">
            <h1 className="font-serif text-xl leading-none">OrçaFlow</h1>
            <p className="text-xs text-muted-foreground">
              {data.professionalName || "Orçamentos profissionais"}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center border rounded-lg overflow-hidden text-sm shrink-0">
            <button
              onClick={() => setActiveTab("budget")}
              className={cn(
                "px-4 py-1.5 transition-colors",
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
                "px-4 py-1.5 transition-colors border-l",
                activeTab === "receipt"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-accent text-muted-foreground",
              )}
            >
              Recibo
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={clearAll} title="Limpar formulários">
              <Trash2 className="h-4 w-4 mr-1.5" />
              Limpar
            </Button>
            <Button onClick={exportPdf} disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Exportar PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={logout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 grid lg:grid-cols-[420px_1fr] gap-6 print:block print:p-0">
        {/* Form panel (hidden on print) */}
        <aside className="lg:sticky lg:top-[88px] lg:self-start lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto pr-2 print:hidden">
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

        {/* Preview panel — only active document renders, so print works naturally */}
        <section className="flex justify-center overflow-x-auto print:block print:overflow-visible">
          <div className="origin-top scale-[0.85] xl:scale-100 transition-transform print:scale-100">
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
        </section>
      </main>
    </div>
  );
}

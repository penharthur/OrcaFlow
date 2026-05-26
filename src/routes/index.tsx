import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { BudgetPreview } from "@/components/budget/BudgetPreview";
import { useBackground, useBudget } from "@/lib/budget-store";
import { supabase } from "@/integrations/supabase/client";
import { saveQuote } from "@/lib/quotes";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "OrçaFlow — Orçamentos" }] }),
});

function Dashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [data, setData] = useBudget();
  const [background, setBackground] = useBackground();
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) navigate({ to: "/login", replace: true });
      else setUserId(session.user.id);
    });
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) navigate({ to: "/login", replace: true });
      else setUserId(data.user.id);
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const exportPdf = async () => {
    if (!previewRef.current || !userId) return;
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: 0,
          filename: `orcamento-${data.clientName || "cliente"}-${Date.now()}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(previewRef.current)
        .save();

      try {
        await saveQuote(data, userId);
        toast.success("PDF exportado e orçamento salvo.");
      } catch (e: any) {
        toast.error(`PDF gerado, mas falhou ao salvar: ${e?.message ?? e}`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar PDF");
    } finally {
      setExporting(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  if (checking || !userId) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl leading-none">OrçaFlow</h1>
            <p className="text-xs text-muted-foreground">Luis Fernando Dias Penha</p>
          </div>
          <div className="flex items-center gap-2">
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

      <main className="max-w-[1600px] mx-auto px-6 py-6 grid lg:grid-cols-[420px_1fr] gap-6">
        <aside className="lg:sticky lg:top-[88px] lg:self-start lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto pr-2">
          <BudgetForm
            data={data}
            setData={setData}
            background={background}
            setBackground={setBackground}
          />
        </aside>
        <section className="flex justify-center overflow-x-auto">
          <div className="origin-top scale-[0.85] xl:scale-100 transition-transform">
            <BudgetPreview ref={previewRef} data={data} background={background} />
          </div>
        </section>
      </main>
    </div>
  );
}

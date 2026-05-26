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

    supabase.auth.getUser().then(({ data: userData, error }) => {
      if (error || !userData.user) {
        navigate({ to: "/login", replace: true });
      } else {
        setUserId(userData.user.id);
        // Pre-fill professional fields from user metadata only when blank
        const meta = userData.user.user_metadata as Record<string, string> | undefined;
        setData((d) => ({
          ...d,
          professionalName: d.professionalName || meta?.name || "",
          contactEmail: d.contactEmail || userData.user.email || "",
          contactPhone: d.contactPhone || meta?.phone || "",
        }));
      }
      setChecking(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate, setData]);

  const exportPdf = async () => {
    if (!userId) return;
    setExporting(true);

    // 1. Salva o título original e muda para o nome do cliente
    const originalTitle = document.title;
    const clientName = data.clientName.trim() || "cliente";
    document.title = `Orçamento de ${clientName}`;

    try {
      // 2. Abre a tela nativa com o nome do arquivo já ajustado
      window.print();

      // 3. Salva o orçamento no seu Supabase
      try {
        await saveQuote(data, userId);
        toast.success("Orçamento salvo com sucesso!");
      } catch (e: unknown) {
        toast.error(`Falha ao salvar no banco: ${e instanceof Error ? e.message : e}`);
      }
    } catch (e: unknown) {
      toast.error("Erro ao processar a impressão.");
    } finally {
      // 4. Devolve o título original para a aba do navegador
      document.title = originalTitle;
      setExporting(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  if (checking || !userId) return null;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Adicione isso para forçar o fundo e tirar margens feias */}
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

      {/* O resto do seu código continua normal aqui... */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b print:hidden">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl leading-none">OrçaFlow</h1>
            <p className="text-xs text-muted-foreground">
              {data.professionalName || "Orçamentos profissionais"}
            </p>
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

      <main className="max-w-[1600px] mx-auto px-6 py-6 grid lg:grid-cols-[420px_1fr] gap-6 print:block print:p-0">
        {/* 2. Esconde o formulário da esquerda na impressão */}
        <aside className="lg:sticky lg:top-[88px] lg:self-start lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto pr-2 print:hidden">
          <BudgetForm
            data={data}
            setData={setData}
            background={background}
            setBackground={setBackground}
          />
        </aside>
        <section className="flex justify-center overflow-x-auto print:block print:overflow-visible">
          <div className="origin-top scale-[0.85] xl:scale-100 transition-transform print:scale-100">
            <BudgetPreview ref={previewRef} data={data} background={background} />
          </div>
        </section>
      </main>
    </div>
  );
}

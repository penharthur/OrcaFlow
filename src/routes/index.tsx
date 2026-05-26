import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Download, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BudgetForm } from "@/components/budget/BudgetForm";
import { BudgetPreview } from "@/components/budget/BudgetPreview";
import { auth, useBackground, useBudget } from "@/lib/budget-store";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({ meta: [{ title: "Orçamentos — Luis Fernando" }] }),
});

function Dashboard() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useBudget();
  const [background, setBackground] = useBackground();
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!auth.isLoggedIn()) navigate({ to: "/login" });
    else setAuthed(true);
  }, [navigate]);

  const exportPdf = async () => {
    if (!previewRef.current) return;
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
  };

  const logout = () => {
    auth.logout();
    navigate({ to: "/login" });
  };

  if (!authed) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-xl leading-none">Orçamentos</h1>
            <p className="text-xs text-muted-foreground">Luis Fernando Dias Penha</p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={exportPdf}><Download className="h-4 w-4 mr-2" /> Exportar PDF</Button>
            <Button variant="ghost" size="icon" onClick={logout} title="Sair"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 grid lg:grid-cols-[420px_1fr] gap-6">
        <aside className="lg:sticky lg:top-[88px] lg:self-start lg:max-h-[calc(100vh-104px)] lg:overflow-y-auto pr-2">
          <BudgetForm data={data} setData={setData} background={background} setBackground={setBackground} />
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

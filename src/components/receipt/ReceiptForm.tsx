import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Copy, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { useState } from "react";
import { getQuotes, type SavedQuote } from "@/lib/quotes";
import { formatBRL } from "@/lib/budget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  buildAddress,
  computeTotals,
  numberToWordsBRL,
  type BudgetData,
} from "@/lib/budget-store";
import type { ReceiptData } from "@/lib/receipt-store";
import { ClientCombobox } from "@/components/budget/ClientCombobox";

const parseNum = (v: string): number => {
  if (v.trim() === "") return 0;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const headerLabel = "text-[11px] uppercase tracking-wider font-semibold text-slate-800";

type Props = {
  data: ReceiptData;
  setData: (updater: (d: ReceiptData) => ReceiptData) => void;
  /** Shared with budget: client name + address */
  budgetData: BudgetData;
  setBudgetData: (updater: (d: BudgetData) => BudgetData) => void;
  userId?: string | null;
};

export function ReceiptForm({ data, setData, budgetData, setBudgetData, userId }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [importQuotes, setImportQuotes] = useState<SavedQuote[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const openImport = async () => {
    if (!userId) { toast.error("Faça login para acessar o histórico."); return; }
    setShowImport(true);
    setImportLoading(true);
    try {
      const qs = await getQuotes(userId);
      setImportQuotes(qs);
    } catch {
      toast.error("Não foi possível carregar os orçamentos.");
    } finally {
      setImportLoading(false);
    }
  };

  const handleSelectQuote = (q: SavedQuote) => {
    const payload = q.payload as BudgetData;
    setBudgetData(() => payload);
    setData((d) => ({ ...d, value: q.total_value ?? 0 }));
    setShowImport(false);
    toast.success("Dados do orçamento importados!");
  };
  /** Computed from the shared address — used in "auto" mode */
  const autoDescription = (() => {
    const addr = buildAddress(budgetData, ", ");
    return addr ? `serviços realizados em ${addr}` : "";
  })();

  /** Copy total value from the open budget */
  const copyValueFromBudget = () => {
    const { total } = computeTotals(budgetData);
    if (total <= 0) {
      toast.error("O orçamento não tem um valor calculado.");
      return;
    }
    setData((d) => ({ ...d, value: total }));
    toast.success("Valor importado do orçamento.");
  };

  return (
    <div className="space-y-8">

      {/* Import from saved budget */}
      <button
        onClick={openImport}
        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/30 px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
      >
        <FileText className="h-4 w-4" />
        Importar dados de um orçamento salvo
      </button>

      {/* ── Shared fields (same as budget) ────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Cliente (compartilhado com o orçamento)
        </h2>

        {/* Client name — combobox with history (same as budget "Aos cuidados de") */}
        <div className="space-y-2">
          <Label className={headerLabel}>Quem paga — nome curto</Label>
          <ClientCombobox
            value={budgetData.clientName}
            onChange={(name) =>
              setBudgetData((d) => ({ ...d, clientName: name, clientId: null }))
            }
            onSelect={(c) =>
              setBudgetData((d) => ({
                ...d,
                clientName: c.name,
                clientFullName: c.full_name || d.clientFullName,
                clientId: c.id,
                addressCondo:  c.address_condo  ?? d.addressCondo,
                addressStreet: c.address_street ?? d.addressStreet,
                addressNumber: c.address_number ?? d.addressNumber,
                addressApt:    c.address_apt    ?? d.addressApt,
                addressCity:   c.address_city   ?? d.addressCity,
              }))
            }
            placeholder="Nome do cliente / pagador"
          />
        </div>

        <div className="space-y-2">
          <Label className={headerLabel}>Nome completo (texto do recibo)</Label>
          <Input
            value={budgetData.clientFullName}
            onChange={(e) => setBudgetData((d) => ({ ...d, clientFullName: e.target.value }))}
            placeholder="Ex: José da Silva Santos"
          />
          <p className="text-[11px] text-muted-foreground">
            Aparece no recibo: "recebi de <strong>nome completo</strong>". Se vazio, usa o nome curto.
          </p>
        </div>

        <div className="space-y-2">
          <Label className={headerLabel}>Condomínio (opcional)</Label>
          <Input
            value={budgetData.addressCondo}
            onChange={(e) => setBudgetData((d) => ({ ...d, addressCondo: e.target.value }))}
            placeholder="Ex: Residencial Park"
          />
        </div>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <div className="space-y-2">
            <Label className={headerLabel}>Rua / Avenida</Label>
            <Input
              value={budgetData.addressStreet}
              onChange={(e) => setBudgetData((d) => ({ ...d, addressStreet: e.target.value }))}
              placeholder="Rua das Flores"
            />
          </div>
          <div className="space-y-2">
            <Label className={headerLabel}>Nº</Label>
            <Input
              value={budgetData.addressNumber}
              onChange={(e) => setBudgetData((d) => ({ ...d, addressNumber: e.target.value }))}
              placeholder="123"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className={headerLabel}>Apartamento (opcional)</Label>
            <Input
              value={budgetData.addressApt}
              onChange={(e) => setBudgetData((d) => ({ ...d, addressApt: e.target.value }))}
              placeholder="Apto 42"
            />
          </div>
          <div className="space-y-2">
            <Label className={headerLabel}>Cidade do endereço</Label>
            <Input
              value={budgetData.addressCity}
              onChange={(e) => setBudgetData((d) => ({ ...d, addressCity: e.target.value }))}
              placeholder="Santos"
            />
          </div>
        </div>
      </section>

      {/* ── Receipt-specific fields ────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dados do recibo
        </h2>

        <div className="space-y-2">
          <Label className={headerLabel}>Quem recebe (você)</Label>
          <Input
            value={data.receiverName}
            onChange={(e) => setData((d) => ({ ...d, receiverName: e.target.value }))}
            placeholder="Seu nome completo"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className={headerLabel}>Cidade (data)</Label>
            <Input
              value={data.city}
              onChange={(e) => setData((d) => ({ ...d, city: e.target.value }))}
              placeholder="Santos"
            />
          </div>
          <div className="space-y-2">
            <Label className={headerLabel}>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "w-full justify-start text-left font-normal text-xs",
                    !data.date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                  {data.date
                    ? format(new Date(data.date), "dd/MM/yyyy", { locale: ptBR })
                    : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={new Date(data.date)}
                  onSelect={(d) => d && setData((p) => ({ ...p, date: d.toISOString() }))}
                  initialFocus
                  locale={ptBR}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Value + copy from budget */}
        <div className="space-y-2">
          <Label className={headerLabel}>Valor (R$)</Label>
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              value={data.value || ""}
              placeholder="0,00"
              onChange={(e) => setData((d) => ({ ...d, value: parseNum(e.target.value) }))}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copyValueFromBudget}
              title="Importar valor total do orçamento"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            O botão copia o total calculado do orçamento.
          </p>
        </div>

        {/* Value in words — auto-computed, manual override allowed */}
        <div className="space-y-2">
          <Label className={headerLabel}>Valor por extenso</Label>
          <Input
            value={data.valueInWords}
            onChange={(e) => setData((d) => ({ ...d, valueInWords: e.target.value }))}
            placeholder={numberToWordsBRL(data.value) || "Ex: seiscentos e cinquenta reais"}
          />
          {!data.valueInWords && data.value > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Gerado automaticamente:{" "}
              <span className="text-foreground italic">{numberToWordsBRL(data.value)}</span>
            </p>
          )}
        </div>
      </section>

      {/* ── Service description ────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Descrição do serviço
        </h2>

        {/* Mode toggle */}
        <div className="flex items-center border rounded-lg overflow-hidden text-sm">
          <button
            onClick={() => setData((d) => ({ ...d, descriptionMode: "auto" }))}
            className={cn(
              "flex-1 px-3 py-1.5 transition-colors text-center",
              data.descriptionMode === "auto"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground",
            )}
          >
            Padrão (endereço)
          </button>
          <button
            onClick={() => setData((d) => ({ ...d, descriptionMode: "custom" }))}
            className={cn(
              "flex-1 px-3 py-1.5 transition-colors border-l text-center",
              data.descriptionMode === "custom"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent text-muted-foreground",
            )}
          >
            Personalizado
          </button>
        </div>

        {/* Auto mode — live preview of computed text */}
        {data.descriptionMode === "auto" && (
          <div className="rounded-lg border bg-muted/40 px-3 py-3 text-sm leading-relaxed text-neutral-700">
            {autoDescription ? (
              <>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
                  Texto gerado automaticamente
                </span>
                referente a <strong className="text-black font-medium">{autoDescription}</strong>.
              </>
            ) : (
              <span className="text-muted-foreground italic text-xs">
                Preencha o endereço para gerar automaticamente.
              </span>
            )}
          </div>
        )}

        {/* Custom mode — free textarea */}
        {data.descriptionMode === "custom" && (
          <div className="space-y-1">
            <Textarea
              value={data.serviceDescription}
              onChange={(e) => setData((d) => ({ ...d, serviceDescription: e.target.value }))}
              rows={3}
              placeholder={
                autoDescription
                  ? `Ex: ${autoDescription}`
                  : "Descreva o serviço prestado..."
              }
              className="text-sm leading-relaxed"
            />
            <p className="text-[11px] text-muted-foreground">
              Este texto substituirá a descrição padrão no recibo.
            </p>
          </div>
        )}
      </section>

      {/* ── Contact info (footer) ──────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Contato (rodapé)
        </h2>
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input
            type="email"
            value={data.contactEmail}
            onChange={(e) => setData((d) => ({ ...d, contactEmail: e.target.value }))}
            placeholder="email@exemplo.com"
          />
        </div>
        <div className="space-y-2">
          <Label>Telefone / WhatsApp</Label>
          <Input
            value={data.contactPhone}
            onChange={(e) => setData((d) => ({ ...d, contactPhone: e.target.value }))}
            placeholder="(11) 99999-9999"
          />
        </div>
      </section>

      {/* Import from budget modal */}
      {showImport && typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-4 sm:fade-in sm:zoom-in duration-200">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div>
                  <h3 className="font-serif text-lg font-medium">Selecionar orçamento</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Clique para importar os dados</p>
                </div>
                <button onClick={() => setShowImport(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* List */}
              <div className="overflow-y-auto flex-1 p-3 space-y-2">
                {importLoading && (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">Carregando...</span>
                  </div>
                )}
                {!importLoading && importQuotes.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-12">
                    Nenhum orçamento salvo ainda.
                  </p>
                )}
                {importQuotes.map((q) => {
                  const name = q.clients?.name || (q.payload as { clientName?: string })?.clientName || "Cliente";
                  const val  = q.total_value != null && q.total_value > 0 ? formatBRL(q.total_value) : null;
                  const date = new Date(q.created_at).toLocaleDateString("pt-BR");
                  return (
                    <button
                      key={q.id}
                      onClick={() => handleSelectQuote(q)}
                      className="w-full text-left rounded-lg border bg-card px-4 py-3 hover:border-primary hover:bg-accent transition-colors"
                    >
                      <p className="font-medium text-sm">{name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {date}{val ? ` · ${val}` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

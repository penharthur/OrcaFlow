import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Copy } from "lucide-react";
import { toast } from "sonner";
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
};

export function ReceiptForm({ data, setData, budgetData, setBudgetData }: Props) {
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
      {/* ── Shared fields (same as budget) ────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Cliente (compartilhado com o orçamento)
        </h2>

        <div className="space-y-2">
          <Label className={headerLabel}>Quem paga (cliente)</Label>
          <Input
            value={budgetData.clientName}
            onChange={(e) => setBudgetData((d) => ({ ...d, clientName: e.target.value }))}
            placeholder="Nome do cliente / pagador"
          />
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
    </div>
  );
}

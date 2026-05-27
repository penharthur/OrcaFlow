import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Sparkles, Upload, X, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { newItem, type BudgetData } from "@/lib/budget-store";
import { structureScope } from "@/lib/ai.functions";
import { SortableItem } from "./SortableItem";
import { ClientCombobox } from "./ClientCombobox";
import { PaymentTermsSelect, ExecutionTermsSelect } from "./TermsSelect";

type Props = {
  data: BudgetData;
  setData: (updater: (d: BudgetData) => BudgetData) => void;
  background: string | null;
  setBackground: (v: string | null) => void;
  /** Optional override for file upload — used in index.tsx to sync to Supabase Storage */
  onUpload?: (file: File) => void;
};

const parseNum = (v: string): number => {
  if (v.trim() === "") return 0;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const headerLabel = "text-[11px] uppercase tracking-wider font-semibold text-slate-800";

export function BudgetForm({ data, setData, background, setBackground, onUpload }: Props) {
  const [aiLoading, setAiLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingPhrases = [
    "Analisando o texto bruto...",
    "Identificando serviços e metragens...",
    "Calculando quantidades e valores...",
    "Aplicando mudanças na tabela...",
    "Finalizando formatação...",
  ];
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleUpload = (file: File) => {
    if (onUpload) {
      onUpload(file);
    } else {
      const reader = new FileReader();
      reader.onload = () => setBackground(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const updateItem = (id: string, patch: Partial<BudgetData["items"][number]>) =>
    setData((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const addItem = () => setData((d) => ({ ...d, items: [...d.items, newItem()] }));

  const removeItem = (id: string) =>
    setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setData((d) => {
      const oldIndex = d.items.findIndex((i) => i.id === active.id);
      const newIndex = d.items.findIndex((i) => i.id === over.id);
      return { ...d, items: arrayMove(d.items, oldIndex, newIndex) };
    });
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (aiLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingPhrases.length - 1 ? prev + 1 : prev));
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [aiLoading]);

  const runAI = async () => {
    if (!data.rawScope.trim()) {
      toast.error("Escreva o escopo bruto antes de estruturar.");
      return;
    }
    setAiLoading(true);
    try {
      const { items, valor_global } = await structureScope(data.rawScope);
      if (!items.length) {
        toast.warning("A IA não retornou itens. Refine o texto e tente novamente.");
        return;
      }
      setData((d) => ({
        ...d,
        items: items.map((it) => ({ ...newItem(), ...it })),
        globalValue: valor_global ?? 0,
      }));
      const globalMsg = valor_global ? ` • Valor global: R$ ${valor_global.toFixed(2).replace(".", ",")}` : "";
      toast.success(`${items.length} itens estruturados pela IA.${globalMsg}`);
    } catch (e: any) {
      // Aqui pegamos o erro 503 e traduzimos para o usuário
      const errorMessage = e instanceof Error ? e.message : String(e);
      if (
        errorMessage.includes("503") ||
        errorMessage.includes("high demand") ||
        errorMessage.toLowerCase().includes("overloaded")
      ) {
        toast.error(
          "A inteligência artificial está muito requisitada agora. Tente novamente em 5 segundinhos!",
        );
      } else {
        toast.error("Falha ao estruturar com IA: Verifique o escopo e tente novamente.");
      }
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Background */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Imagem de fundo
        </h2>
        <div className="flex items-center gap-3">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
            />
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-card text-sm cursor-pointer hover:bg-accent transition">
              <Upload className="h-4 w-4" /> Carregar JPG/PNG
            </span>
          </label>
          {background && (
            <Button variant="ghost" size="sm" onClick={() => setBackground(null)}>
              <X className="h-4 w-4 mr-1" /> Remover
            </Button>
          )}
        </div>
      </section>

      {/* Header */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Cabeçalho
        </h2>
        <div className="space-y-2">
          <Label className={headerLabel}>Aos cuidados de (nome curto)</Label>
          <ClientCombobox
            value={data.clientName}
            onChange={(name) => setData((d) => ({ ...d, clientName: name, clientId: null }))}
            onSelect={(c) =>
              setData((d) => ({
                ...d,
                clientName: c.name,
                clientFullName: c.full_name || d.clientFullName,
                clientId: c.id,
                // Fill structured address fields (keep existing if already set)
                addressCondo:  c.address_condo  ?? d.addressCondo,
                addressStreet: c.address_street ?? d.addressStreet,
                addressNumber: c.address_number ?? d.addressNumber,
                addressApt:    c.address_apt    ?? d.addressApt,
                addressCity:   c.address_city   ?? d.addressCity,
              }))
            }
            placeholder="Nome do cliente"
          />
        </div>

        <div className="space-y-2">
          <Label className={headerLabel}>Nome completo (para recibo)</Label>
          <Input
            value={data.clientFullName}
            onChange={(e) => setData((d) => ({ ...d, clientFullName: e.target.value }))}
            placeholder="Ex: José da Silva Santos"
          />
          <p className="text-[11px] text-muted-foreground">
            Opcional — usado no texto do recibo como pagador.
          </p>
        </div>

        {/* Structured address */}
        <div className="space-y-2">
          <Label className={headerLabel}>Condomínio (opcional)</Label>
          <Input
            value={data.addressCondo}
            onChange={(e) => setData((d) => ({ ...d, addressCondo: e.target.value }))}
            placeholder="Ex: Residencial Park"
          />
        </div>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <div className="space-y-2">
            <Label className={headerLabel}>Rua / Avenida</Label>
            <Input
              value={data.addressStreet}
              onChange={(e) => setData((d) => ({ ...d, addressStreet: e.target.value }))}
              placeholder="Rua das Flores"
            />
          </div>
          <div className="space-y-2">
            <Label className={headerLabel}>Nº</Label>
            <Input
              value={data.addressNumber}
              onChange={(e) => setData((d) => ({ ...d, addressNumber: e.target.value }))}
              placeholder="123"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label className={headerLabel}>Apartamento (opcional)</Label>
            <Input
              value={data.addressApt}
              onChange={(e) => setData((d) => ({ ...d, addressApt: e.target.value }))}
              placeholder="Apto 42"
            />
          </div>
          <div className="space-y-2">
            <Label className={headerLabel}>Cidade</Label>
            <Input
              value={data.addressCity}
              onChange={(e) => setData((d) => ({ ...d, addressCity: e.target.value }))}
              placeholder="Santos"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className={headerLabel}>Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !data.date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.date
                  ? format(new Date(data.date), "PPP", { locale: ptBR })
                  : "Selecionar data"}
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
      </section>

      {/* AI scope */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Escopo bruto
        </h2>
        <Textarea
          value={data.rawScope}
          onChange={(e) => setData((d) => ({ ...d, rawScope: e.target.value }))}
          rows={6}
          placeholder={
            "Cole aqui o escopo livre. Ex.:\n- Pintura de 2 paredes do quarto, 25m2\n- Reparo de rodapé\n- Substituir tomada da cozinha (R$ 80)"
          }
          className="min-h-[140px] font-mono text-sm leading-relaxed"
        />
        <Button onClick={runAI} disabled={aiLoading} className="w-full mt-4">
          <Sparkles className="h-4 w-4 mr-2" />
          Estruturar Orçamento (IA)
        </Button>
      </section>

      {/* Items list */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Serviços ({data.items.length})
          </h2>
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={data.items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {data.items.map((item, idx) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={idx}
                  canRemove={data.items.length > 1}
                  onChange={(patch) => updateItem(item.id, patch)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="pt-2 border-t space-y-3">
          {/* Valor global — substitui o cálculo por item */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Valor global do serviço (R$)</Label>
            <Input
              inputMode="decimal"
              value={data.globalValue || ""}
              placeholder="0,00"
              onChange={(e) => setData((d) => ({ ...d, globalValue: parseNum(e.target.value) }))}
            />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Quando preenchido, aparece direto no total — ideal para orçamentos sem preço por item.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Acréscimo (R$)</Label>
              <Input
                inputMode="decimal"
                value={data.surcharge || ""}
                placeholder="0,00"
                onChange={(e) => setData((d) => ({ ...d, surcharge: parseNum(e.target.value) }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desconto (R$)</Label>
              <Input
                inputMode="decimal"
                value={data.discount || ""}
                placeholder="0,00"
                onChange={(e) => setData((d) => ({ ...d, discount: parseNum(e.target.value) }))}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Conditions */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Condições
        </h2>
        <div className="flex items-center justify-between border rounded-lg p-3 bg-card">
          <div>
            <Label className="font-medium">Material incluso</Label>
            <p className="text-xs text-muted-foreground">
              {data.materialIncluded ? "Material incluso no orçamento" : "Apenas mão de obra"}
            </p>
          </div>
          <Switch
            checked={data.materialIncluded}
            onCheckedChange={(v) => setData((d) => ({ ...d, materialIncluded: v }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Prazo de pagamento</Label>
          <PaymentTermsSelect
            value={data.paymentTerms}
            onChange={(v) => setData((d) => ({ ...d, paymentTerms: v }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Prazo de realização</Label>
          <ExecutionTermsSelect
            value={data.executionTerms}
            onChange={(v) => setData((d) => ({ ...d, executionTerms: v }))}
          />
        </div>
      </section>

      {/* Professional info — pre-filled from auth, always editable */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Dados do profissional
        </h2>
        <div className="space-y-2">
          <Label>Nome do profissional</Label>
          <Input
            value={data.professionalName}
            onChange={(e) => setData((d) => ({ ...d, professionalName: e.target.value }))}
            placeholder="Seu nome completo"
          />
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Input
            value={data.city}
            onChange={(e) => setData((d) => ({ ...d, city: e.target.value }))}
            placeholder="Santos"
          />
        </div>
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
      {/* MODAL DE LOADING DA IA (AGORA COM PORTAL) */}
      {aiLoading &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all">
            <div className="bg-white p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-sm w-full animate-in fade-in zoom-in duration-200">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-5" />
              <h3 className="text-lg font-serif font-medium text-black text-center mb-2">
                Estruturando Orçamento
              </h3>
              <p className="text-sm text-neutral-600 text-center animate-pulse h-5">
                {loadingPhrases[loadingStep]}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

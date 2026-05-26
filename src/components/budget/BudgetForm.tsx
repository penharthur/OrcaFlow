import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { BudgetData } from "@/lib/budget-store";

type Props = {
  data: BudgetData;
  setData: (updater: (d: BudgetData) => BudgetData) => void;
  background: string | null;
  setBackground: (v: string | null) => void;
};

export function BudgetForm({ data, setData, background, setBackground }: Props) {
  const onUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setBackground(reader.result as string);
    reader.readAsDataURL(file);
  };

  const updateItem = (id: string, patch: Partial<BudgetData["items"][number]>) =>
    setData((d) => ({ ...d, items: d.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));

  const addItem = () =>
    setData((d) => ({
      ...d,
      items: [...d.items, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }],
    }));

  const removeItem = (id: string) =>
    setData((d) => ({ ...d, items: d.items.filter((i) => i.id !== id) }));

  return (
    <div className="space-y-8">
      {/* Background */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Configurações visuais</h2>
        <div className="flex items-center gap-3">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
            />
            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md border bg-card text-sm cursor-pointer hover:bg-accent transition">
              <Upload className="h-4 w-4" /> Imagem de fundo
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
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Cabeçalho</h2>
        <div className="space-y-2">
          <Label>Aos cuidados de</Label>
          <Input value={data.clientName} onChange={(e) => setData((d) => ({ ...d, clientName: e.target.value }))} placeholder="Nome do cliente" />
        </div>
        <div className="space-y-2">
          <Label>Endereço completo</Label>
          <Textarea value={data.address} onChange={(e) => setData((d) => ({ ...d, address: e.target.value }))} placeholder="Rua, número, bairro, cidade" rows={2} />
        </div>
        <div className="space-y-2">
          <Label>Data</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !data.date && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {data.date ? format(new Date(data.date), "PPP", { locale: ptBR }) : "Selecionar data"}
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

      {/* Items */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Serviços</h2>
          <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Adicionar item</Button>
        </div>
        <div className="space-y-3">
          {data.items.map((item, idx) => {
            const subtotal = item.quantity * item.unitPrice;
            return (
              <div key={item.id} className="border rounded-lg p-3 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Item {idx + 1}</span>
                  {data.items.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <Textarea
                  value={item.description}
                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                  placeholder="Descrição do serviço"
                  rows={2}
                />
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Qtd.</Label>
                    <Input type="number" min={0} step="0.01" value={item.quantity}
                      onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor un.</Label>
                    <Input type="number" min={0} step="0.01" value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subtotal</Label>
                    <Input readOnly value={subtotal.toFixed(2)} className="bg-muted" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Condições</h2>
        <div className="flex items-center justify-between border rounded-lg p-3 bg-card">
          <div>
            <Label className="font-medium">Material incluso</Label>
            <p className="text-xs text-muted-foreground">{data.materialIncluded ? "Material incluso no orçamento" : "Apenas mão de obra"}</p>
          </div>
          <Switch checked={data.materialIncluded} onCheckedChange={(v) => setData((d) => ({ ...d, materialIncluded: v }))} />
        </div>
        <div className="space-y-2">
          <Label>Prazo de pagamento</Label>
          <Input value={data.paymentTerms} onChange={(e) => setData((d) => ({ ...d, paymentTerms: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>Prazo de realização</Label>
          <Input value={data.executionTerms} onChange={(e) => setData((d) => ({ ...d, executionTerms: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label>E-mail / contato</Label>
          <Input value={data.contactEmail} onChange={(e) => setData((d) => ({ ...d, contactEmail: e.target.value }))} placeholder="email@exemplo.com" />
        </div>
      </section>
    </div>
  );
}

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BudgetItem } from "@/lib/budget-store";

const parseNum = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

type Props = {
  item: BudgetItem;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<BudgetItem>) => void;
  onRemove: () => void;
};

export function SortableItem({ item, index, canRemove, onChange, onRemove }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasValues = item.quantity != null && item.unitPrice != null;
  const subtotal = hasValues ? (item.quantity || 0) * (item.unitPrice || 0) : null;

  // When user edits any field, clear the AI indicator for this item
  const handleChange = (patch: Partial<BudgetItem>) =>
    onChange({ ...patch, aiGenerated: false });

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg p-3 bg-card space-y-3 transition-colors",
        item.aiGenerated && "border-blue-300 ring-1 ring-blue-200 bg-blue-50/20",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
            {...attributes}
            {...listeners}
            aria-label="Reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-xs text-muted-foreground font-medium">Item {index + 1}</span>
          {item.aiGenerated && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full">
              <Sparkles className="h-2.5 w-2.5" />
              IA
            </span>
          )}
        </div>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      <Textarea
        value={item.description}
        onChange={(e) => handleChange({ description: e.target.value })}
        placeholder="Descrição do serviço"
        rows={3}
        className="min-h-[80px] resize-y text-sm leading-relaxed"
      />

      {/* Qtd. + Unidade + Valor un. + Subtotal */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Qtd.</Label>
          <Input
            inputMode="decimal"
            placeholder="—"
            value={item.quantity ?? ""}
            onChange={(e) => handleChange({ quantity: parseNum(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Unidade</Label>
          <Input
            placeholder="m2, un, h..."
            value={item.unit ?? ""}
            onChange={(e) => handleChange({ unit: e.target.value })}
            className="text-xs"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor un.</Label>
          <Input
            inputMode="decimal"
            placeholder="—"
            value={item.unitPrice ?? ""}
            onChange={(e) => handleChange({ unitPrice: parseNum(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Subtotal</Label>
          <Input readOnly value={subtotal != null ? subtotal.toFixed(2) : "—"} className="bg-muted" />
        </div>
      </div>
    </div>
  );
}
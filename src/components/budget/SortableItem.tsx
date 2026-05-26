import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  return (
    <div ref={setNodeRef} style={style} className="border rounded-lg p-3 bg-card space-y-3">
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
        </div>
        {canRemove && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      <Textarea
        value={item.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Descrição do serviço"
        rows={3}
        className="min-h-[80px] resize-y text-sm leading-relaxed"
      />
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Qtd.</Label>
          <Input
            inputMode="decimal"
            placeholder="—"
            value={item.quantity ?? ""}
            onChange={(e) => onChange({ quantity: parseNum(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Valor un.</Label>
          <Input
            inputMode="decimal"
            placeholder="—"
            value={item.unitPrice ?? ""}
            onChange={(e) => onChange({ unitPrice: parseNum(e.target.value) })}
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

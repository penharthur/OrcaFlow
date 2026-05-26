import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Phone } from "lucide-react";
import { buildAddress, formatBRL, numberToWordsBRL, type BudgetData } from "@/lib/budget-store";
import type { ReceiptData } from "@/lib/receipt-store";

type Props = {
  data: ReceiptData;
  /** Shared fields: payer name + address come from the budget */
  budgetData: BudgetData;
  background: string | null;
};

export const ReceiptPreview = forwardRef<HTMLDivElement, Props>(
  ({ data, budgetData, background }, ref) => {
    const dateObj = new Date(data.date);
    const day = format(dateObj, "d", { locale: ptBR });
    const month = format(dateObj, "MMMM", { locale: ptBR });
    const year = format(dateObj, "yyyy");

    const payerName = budgetData.clientName || "—";

    // Auto mode: "serviços realizados em [address]"
    // Custom mode: whatever the user typed
    const addressInline = buildAddress(budgetData, ", ");
    const descriptionText =
      data.descriptionMode === "custom"
        ? data.serviceDescription || "—"
        : addressInline
          ? `serviços realizados em ${addressInline}`
          : "serviços prestados";

    // Manual override takes priority; otherwise auto-compute from value
    const valueInWords = data.valueInWords || numberToWordsBRL(data.value);

    return (
      <div ref={ref} className="a4-sheet relative overflow-hidden">
        {/* Background image */}
        {background && (
          <div
            className="absolute inset-0 z-0"
            style={{
              backgroundImage: `url(${background})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
        )}
        {background && <div className="absolute inset-0 z-0 bg-white/70" />}

        <div className="relative z-10 flex flex-col min-h-[297mm]">
          <div className="flex-1 flex flex-col px-14 py-16">
            {/* Title */}
            <h1 className="font-serif text-4xl font-bold tracking-[0.35em] uppercase text-center border-b-2 border-black pb-6 mb-16">
              Recibo
            </h1>

            {/* Body — grows to fill space */}
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-[18px] leading-[1.9] text-justify text-black">
                Eu,{" "}
                <strong className="font-semibold">{data.receiverName || "—"}</strong>, declaro
                que recebi de{" "}
                <strong className="font-semibold">{payerName}</strong> a quantia de{" "}
                <strong className="font-semibold">
                  {data.value > 0 ? formatBRL(data.value) : "—"}
                  {valueInWords ? ` (${valueInWords})` : ""}
                </strong>
                , referente a {descriptionText}.
              </p>

              {/* City + date */}
              <p className="mt-16 text-base text-center text-neutral-700">
                {data.city ? `${data.city}, ` : ""}
                {day} de {month} de {year}.
              </p>
            </div>

            {/* Footer: contact left, name right */}
            <footer className="mt-14 pt-6 flex items-end justify-between gap-8">
              <div className="text-xs text-neutral-800 space-y-1.5">
                {data.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-neutral-700 shrink-0" strokeWidth={2} />
                    <span>{data.contactEmail}</span>
                  </div>
                )}
                {data.contactPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-neutral-700 shrink-0" strokeWidth={2} />
                    <span>{data.contactPhone}</span>
                  </div>
                )}
              </div>

              {data.receiverName && (
                <div className="text-right">
                  <p className="font-serif text-base text-black leading-tight">
                    {data.receiverName}
                  </p>
                </div>
              )}
            </footer>
          </div>
        </div>
      </div>
    );
  },
);
ReceiptPreview.displayName = "ReceiptPreview";

import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Phone } from "lucide-react";
import { computeTotals, formatBRL, type BudgetData } from "@/lib/budget-store";

type Props = { data: BudgetData; background: string | null };

export const BudgetPreview = forwardRef<HTMLDivElement, Props>(({ data, background }, ref) => {
  const { subtotal, total } = computeTotals(data);
  const anyItemHasValues = data.items.some((i) => i.quantity != null && i.unitPrice != null);
  const showTable = anyItemHasValues;
  const showTotal = total !== 0 || subtotal !== 0;

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
      {/* Watermark overlay for legibility */}
      {background && <div className="absolute inset-0 z-0 bg-white/70" />}

      <div className="relative z-10 flex flex-col min-h-[297mm]">
        <div className="flex-1 flex flex-col px-14 py-12">
          {/* Header */}
          <header className="border-b border-neutral-400 pb-6 mb-8">
            <div className="flex justify-between items-start gap-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-700 mb-1 font-semibold">
                  Orçamento
                </p>
                <h1 className="font-serif text-3xl leading-tight text-black">Proposta de Serviço</h1>
              </div>
              <div className="text-right text-xs">
                <p className="uppercase tracking-wider text-[11px] text-slate-800 font-semibold mb-0.5">
                  Data
                </p>
                <p className="font-medium text-black">
                  {format(new Date(data.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              <span className="uppercase tracking-wider text-[11px] text-slate-800 font-semibold">
                Aos cuidados de
              </span>
              <span className="text-black font-medium">{data.clientName || "—"}</span>
              <span className="uppercase tracking-wider text-[11px] text-slate-800 font-semibold">
                Endereço
              </span>
              <span className="text-neutral-900 whitespace-pre-line">{data.address || "—"}</span>
            </div>
          </header>

          {/* Services */}
          <section className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-700 mb-4 font-semibold">
              Escopo dos serviços
            </p>

            {showTable ? (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-700 font-semibold border-b border-neutral-400">
                    <th className="py-2">Descrição</th>
                    <th className="py-2 text-center w-16">Qtd.</th>
                    <th className="py-2 text-right w-24">Valor un.</th>
                    <th className="py-2 text-right w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => {
                    const has = i.quantity != null && i.unitPrice != null;
                    return (
                      <tr key={i.id} className="border-b border-neutral-200 align-top">
                        <td className="py-3 pr-3 text-neutral-900 whitespace-pre-line leading-relaxed">
                          {i.description || "—"}
                        </td>
                        <td className="py-3 text-center text-neutral-800">{has ? i.quantity : ""}</td>
                        <td className="py-3 text-right text-neutral-800">
                          {has ? formatBRL(i.unitPrice as number) : ""}
                        </td>
                        <td className="py-3 text-right text-black font-medium">
                          {has ? formatBRL((i.quantity as number) * (i.unitPrice as number)) : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="space-y-4">
                {data.items.map((i) => (
                  <div
                    key={i.id}
                    className="text-xs text-neutral-900 whitespace-pre-line leading-relaxed"
                  >
                    {i.description || "—"}
                  </div>
                ))}
              </div>
            )}

            {showTotal && (
              <div className="mt-6 ml-auto w-fit text-xs space-y-1">
                {showTable && (
                  <div className="flex justify-between gap-8">
                    <span className="text-slate-700">Subtotal</span>
                    <span className="text-neutral-800">{formatBRL(subtotal)}</span>
                  </div>
                )}
                {data.surcharge > 0 && (
                  <div className="flex justify-between gap-8">
                    <span className="text-slate-700">Acréscimo</span>
                    <span className="text-neutral-800">+ {formatBRL(data.surcharge)}</span>
                  </div>
                )}
                {data.discount > 0 && (
                  <div className="flex justify-between gap-8">
                    <span className="text-slate-700">Desconto</span>
                    <span className="text-neutral-800">− {formatBRL(data.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline gap-8 pt-2 border-t border-neutral-400">
                  <span className="text-[10px] uppercase tracking-wider text-slate-800 font-semibold">
                    Valor total
                  </span>
                  <span className="font-serif text-2xl text-black">{formatBRL(total)}</span>
                </div>
              </div>
            )}
          </section>

          {/* Conditions */}
          <section className="mt-8 pt-6 border-t border-neutral-400 grid grid-cols-3 gap-6 text-xs">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Modalidade
              </p>
              <p className="text-neutral-900">
                {data.materialIncluded ? "Material incluso" : "Apenas mão de obra"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Pagamento
              </p>
              <p className="text-neutral-900">{data.paymentTerms || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-700 font-semibold mb-1">
                Prazo de execução
              </p>
              <p className="text-neutral-900">{data.executionTerms || "—"}</p>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-14 pt-6 grid grid-cols-[1fr_auto] gap-8 items-end">
            {/* Left: dynamic contacts */}
            <div className="text-xs text-neutral-800 space-y-1.5">
              {data.contactPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-neutral-700" strokeWidth={2} />
                  <span>{data.contactPhone}</span>
                </div>
              )}
              {data.contactEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-neutral-700" strokeWidth={2} />
                  <span>{data.contactEmail}</span>
                </div>
              )}
            </div>

            {/* Right: signature block centered */}
            <div className="text-center min-w-[260px]">
              <div className="border-t-2 border-black pt-2">
                <p className="font-serif text-base text-black leading-tight">
                  Luis Fernando Dias Penha
                </p>
                <p className="font-serif text-[11px] text-neutral-700 italic mt-0.5">
                  luisfernandodiaspenha@gmail.com
                </p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
});
BudgetPreview.displayName = "BudgetPreview";

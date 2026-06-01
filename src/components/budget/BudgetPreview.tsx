import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Mail, Phone } from "lucide-react";
import { buildAddress, computeTotals, formatBRL, type BudgetData } from "@/lib/budget-store";

type Props = { data: BudgetData; background: string | null };

export const BudgetPreview = forwardRef<HTMLDivElement, Props>(({ data, background }, ref) => {
  const { subtotal, total, isGlobal } = computeTotals(data);
  const anyItemHasValues = data.items.some((i) => i.quantity != null || i.unitPrice != null);
  const anyItemHasQty   = data.items.some((i) => i.quantity != null);
  const showTable    = anyItemHasValues && !isGlobal;
  const showQtyOnly  = isGlobal && anyItemHasQty;
  const showTotal    = total !== 0 || subtotal !== 0 || isGlobal;
  const address      = buildAddress(data);
  const observations = data.observations ?? [];

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
        {/* Padding reduzido para caber mais em 1 folha */}
        <div className="flex-1 flex flex-col px-12 py-8">

          {/* Header */}
          <header className="border-b border-neutral-400 pb-4 mb-5">
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

            <div className="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
              <span className="uppercase tracking-wider text-[11px] text-slate-800 font-semibold">
                Aos cuidados de
              </span>
              <span className="text-black font-medium">{data.clientName || "—"}</span>

              {/* Endereço só aparece se ao menos um campo estiver preenchido */}
              {address && (
                <>
                  <span className="uppercase tracking-wider text-[11px] text-slate-800 font-semibold">
                    Endereço
                  </span>
                  <span className="text-neutral-900 whitespace-pre-line">{address}</span>
                </>
              )}
            </div>
          </header>

          {/* Services */}
          <section className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-700 mb-3 font-semibold">
              Escopo dos serviços
            </p>

            {showTable ? (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-700 font-semibold border-b border-neutral-400">
                    <th className="py-1.5">Descrição</th>
                    <th className="py-1.5 text-center w-16">Qtd.</th>
                    <th className="py-1.5 text-right w-24">Valor un.</th>
                    <th className="py-1.5 text-right w-28">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => {
                    const hasQty   = i.quantity  != null;
                    const hasPrice = i.unitPrice != null;
                    const hasBoth  = hasQty && hasPrice;
                    return (
                      <tr key={i.id} className="border-b border-neutral-200 align-top">
                        <td className="py-2 pr-3 text-neutral-900 whitespace-pre-line leading-snug">
                          {i.description || "—"}
                        </td>
                        <td className="py-2 text-center text-neutral-800">
                          {hasQty ? i.quantity : ""}
                        </td>
                        <td className="py-2 text-right text-neutral-800">
                          {hasPrice ? formatBRL(i.unitPrice as number) : hasQty ? "—" : ""}
                        </td>
                        <td className="py-2 text-right text-black font-medium">
                          {hasBoth
                            ? formatBRL((i.quantity as number) * (i.unitPrice as number))
                            : hasQty
                            ? "—"
                            : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : showQtyOnly ? (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-slate-700 font-semibold border-b border-neutral-400">
                    <th className="py-1.5">Descrição</th>
                    <th className="py-1.5 text-center w-16">Qtd.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((i) => (
                    <tr key={i.id} className="border-b border-neutral-200 align-top">
                      <td className="py-2 pr-3 text-neutral-900 whitespace-pre-line leading-snug">
                        {i.description || "—"}
                      </td>
                      <td className="py-2 text-center text-neutral-800">
                        {i.quantity != null ? i.quantity : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="space-y-3">
                {data.items.map((i) => (
                  <div
                    key={i.id}
                    className="text-xs text-neutral-900 whitespace-pre-line leading-snug"
                  >
                    {i.description || "—"}
                  </div>
                ))}
              </div>
            )}

            {/* Observações */}
            {observations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-neutral-200">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-700 mb-2 font-semibold">
                  Observações
                </p>
                <ul className="space-y-1.5 text-xs text-neutral-800">
                  {observations.map((obs, idx) => (
                    <li key={idx} className="flex gap-2 leading-snug">
                      <span className="font-semibold shrink-0 text-slate-700">{idx + 1}.</span>
                      <span className="whitespace-pre-line">{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Totais */}
            {showTotal && (
              <div className="mt-4 ml-auto w-fit text-xs space-y-1">
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
          <section className="mt-5 pt-4 border-t border-neutral-400 grid grid-cols-3 gap-6 text-xs">
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
          <footer className="mt-6 pt-5 flex items-end justify-between gap-8">
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

            {data.professionalName && (
              <div className="text-right">
                <p className="font-serif text-base text-black leading-tight">
                  {data.professionalName}
                </p>
              </div>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
});
BudgetPreview.displayName = "BudgetPreview";
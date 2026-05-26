import { forwardRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL, type BudgetData } from "@/lib/budget-store";

type Props = { data: BudgetData; background: string | null };

export const BudgetPreview = forwardRef<HTMLDivElement, Props>(({ data, background }, ref) => {
  const total = data.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  return (
    <div
      ref={ref}
      className="a4-sheet flex flex-col"
      style={background ? { backgroundImage: `url(${background})` } : undefined}
    >
      <div className="flex-1 flex flex-col px-14 py-12">
        {/* Header */}
        <header className="border-b border-neutral-300 pb-6 mb-8">
          <div className="flex justify-between items-start gap-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500 mb-1">Orçamento</p>
              <h1 className="font-serif text-3xl leading-tight text-neutral-900">
                Proposta de Serviço
              </h1>
            </div>
            <div className="text-right text-xs text-neutral-600">
              <p className="uppercase tracking-wider text-[10px] text-neutral-400 mb-0.5">Data</p>
              <p className="font-medium text-neutral-800">
                {format(new Date(data.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
            <span className="text-neutral-400 uppercase tracking-wider text-[10px]">Aos cuidados de</span>
            <span className="text-neutral-800 font-medium">{data.clientName || "—"}</span>
            <span className="text-neutral-400 uppercase tracking-wider text-[10px]">Endereço</span>
            <span className="text-neutral-700 whitespace-pre-line">{data.address || "—"}</span>
          </div>
        </header>

        {/* Items table */}
        <section className="flex-1">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-neutral-500 border-b border-neutral-300">
                <th className="py-2 font-medium">Descrição</th>
                <th className="py-2 font-medium text-center w-16">Qtd.</th>
                <th className="py-2 font-medium text-right w-24">Valor un.</th>
                <th className="py-2 font-medium text-right w-28">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((i) => (
                <tr key={i.id} className="border-b border-neutral-100 align-top">
                  <td className="py-3 pr-2 text-neutral-800 whitespace-pre-line">{i.description || "—"}</td>
                  <td className="py-3 text-center text-neutral-700">{i.quantity}</td>
                  <td className="py-3 text-right text-neutral-700">{formatBRL(i.unitPrice)}</td>
                  <td className="py-3 text-right text-neutral-900 font-medium">{formatBRL(i.quantity * i.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="pt-5 text-right text-[10px] uppercase tracking-wider text-neutral-500">Valor total</td>
                <td className="pt-5 text-right font-serif text-xl text-neutral-900">{formatBRL(total)}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Conditions */}
        <section className="mt-8 pt-6 border-t border-neutral-300 grid grid-cols-3 gap-6 text-xs">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">Modalidade</p>
            <p className="text-neutral-800">{data.materialIncluded ? "Material incluso" : "Apenas mão de obra"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">Pagamento</p>
            <p className="text-neutral-800">{data.paymentTerms || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">Prazo de execução</p>
            <p className="text-neutral-800">{data.executionTerms || "—"}</p>
          </div>
        </section>

        {/* Signature */}
        <footer className="mt-14 pt-6">
          <div className="max-w-xs">
            <div className="border-t border-neutral-800 pt-2">
              <p className="font-serif text-sm text-neutral-900">Luis Fernando Dias Penha</p>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider">
                {data.contactEmail || "contato profissional"}
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
});
BudgetPreview.displayName = "BudgetPreview";

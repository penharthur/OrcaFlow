import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchClients, type ClientRow } from "@/lib/quotes";

type Props = {
  value: string;
  onChange: (name: string) => void;
  onSelect: (client: ClientRow) => void;
  placeholder?: string;
};

export function ClientCombobox({ value, onChange, onSelect, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!value || value.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await searchClients(value);
        setResults(rows);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(handle);
  }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  /** Build a short inline address string from structured fields */
  const formatAddress = (c: ClientRow): string => {
    const parts: string[] = [];
    if (c.address_condo) parts.push(`Cond. ${c.address_condo}`);
    const street = [c.address_street, c.address_number].filter(Boolean).join(", ");
    if (street) parts.push(street + (c.address_apt ? `, Apto ${c.address_apt}` : ""));
    if (c.address_city) parts.push(c.address_city);
    return parts.join(", ");
  };

  return (
    <div className="relative" ref={boxRef}>
      <Input
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-64 overflow-auto">
          {loading && <div className="px-3 py-2 text-xs text-muted-foreground">Buscando…</div>}
          {results.map((c) => {
            const addr = formatAddress(c);
            return (
              <button
                key={c.id}
                type="button"
                className="w-full text-left px-3 py-2.5 hover:bg-accent text-sm border-b last:border-b-0"
                onClick={() => {
                  onSelect(c);
                  setOpen(false);
                }}
              >
                {/* Short name */}
                <div className="font-medium text-foreground">{c.name}</div>
                {/* Full name (if different from name) */}
                {c.full_name && c.full_name !== c.name && (
                  <div className="text-xs text-muted-foreground">{c.full_name}</div>
                )}
                {/* Inline address */}
                {addr && (
                  <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{addr}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

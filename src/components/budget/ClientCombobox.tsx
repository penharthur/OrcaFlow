import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { searchClients } from "@/lib/quotes";

type ClientRow = { id: string; name: string; address: string };

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
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-b-0"
              onClick={() => {
                onSelect(c);
                setOpen(false);
              }}
            >
              <div className="font-medium text-foreground">{c.name}</div>
              {c.address && (
                <div className="text-xs text-muted-foreground line-clamp-1">{c.address}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

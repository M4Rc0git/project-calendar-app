import React from "react";

type ItemDef = {
  value: string;
  label: string;
  dotColor?: string;
  content?: React.ReactNode; // full JSX for menu row
};

type SelectRootProps = {
  value?: string;
  onValueChange?: (v: string) => void;
  children: React.ReactNode;
  className?: string;
  placeholder?: string;
};

export function Select({ value, onValueChange, children, className = "", placeholder = "Select" }: SelectRootProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const [items, setItems] = React.useState<ItemDef[]>([]);

  // Collect items from <SelectContent><SelectItem/></SelectContent>
  React.useEffect(() => {
    const collected: ItemDef[] = [];
    React.Children.forEach(children as any, (child: any) => {
      if (child?.type?.displayName === "SelectContent") {
        React.Children.forEach(child.props.children, (grand: any) => {
          if (grand?.type?.displayName === "SelectItem") {
            const v = String(grand.props.value ?? "");
            const label = grand.props.label ?? v;
            const dotColor = grand.props.dotColor as string | undefined;
            collected.push({ value: v, label, dotColor, content: grand.props.children });
          }
        });
      }
    });
    setItems(collected);
  }, [children]);

  // Close on outside click / escape
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!open) return;
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = items.find((it) => it.value === value);

  return (
    <div className={`relative ${className}`} ref={ref}>
      {/* Trigger */}
      <button
        type="button"
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 flex items-center justify-between"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 truncate">
          {selected?.dotColor ? <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selected.dotColor }} /> : null}
          <span className="truncate">{selected ? selected.label : placeholder}</span>
        </span>
        <span className="ml-2 text-slate-500">▾</span>
      </button>

      {/* Menu */}
      {open && (
        <div
          role="listbox"
          className="absolute z-40 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-xl"
        >
          {items.map((it) => {
            const active = it.value === value;
            return (
              <button
                key={it.value}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onValueChange?.(it.value);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 ${active ? "bg-slate-50" : ""}`}
              >
                <span className="flex items-center gap-2 truncate">
                  {it.dotColor ? <span className="h-3 w-3 rounded-full" style={{ backgroundColor: it.dotColor }} /> : null}
                  {/* Use provided JSX if present; fallback to label text */}
                  <span className="truncate">{it.content ?? it.label}</span>
                </span>
                {active && <span className="text-slate-700">✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* We keep these for API compatibility, but they don't render UI */}
      <div style={{ display: "none" }}>
        {children}
      </div>
    </div>
  );
}
Select.displayName = "Select";

export function SelectTrigger({ children, className = "" }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={className} style={{ display: "none" }}>{children}</div>;
}
SelectTrigger.displayName = "SelectTrigger";

export function SelectValue({
  placeholder,
}: {
  placeholder?: string;
}) {
  // Placeholder is handled by Select trigger; we keep this for compatibility.
  return <>{placeholder ?? null}</>;
}
SelectValue.displayName = "SelectValue";

export function SelectContent({ children }: React.PropsWithChildren<{}>) {
  return <>{children}</>;
}
SelectContent.displayName = "SelectContent";

export function SelectItem({
  value,
  label,
  dotColor,
  children,
}: React.PropsWithChildren<{ value: string; label?: string; dotColor?: string }>) {
  return <>{children}</>;
}
SelectItem.displayName = "SelectItem";

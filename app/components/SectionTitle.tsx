export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">{title}</h2>
      {action ? <span className="text-xs text-slate-400">{action}</span> : null}
    </div>
  );
}

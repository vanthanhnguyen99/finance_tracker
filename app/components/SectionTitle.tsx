export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {action ? <span className="text-sm text-slate-500">{action}</span> : null}
    </div>
  );
}

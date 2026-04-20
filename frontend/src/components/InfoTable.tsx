export type InfoRow = {
  label: string;
  value: string;
};

type InfoTableProps = {
  emptyText?: string;
  rows: InfoRow[];
  title: string;
};

export function InfoTable({ emptyText, rows, title }: InfoTableProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <h2 className="border-b border-slate-200 px-4 py-3 text-base font-semibold tracking-normal">
        {title}
      </h2>
      {rows.length ? (
        <dl className="divide-y divide-slate-100">
          {rows.map((row) => (
            <div
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3 px-4 py-3"
              key={row.label}
            >
              <dt className="text-sm text-slate-500">{row.label}</dt>
              <dd className="break-words text-right text-sm font-medium text-slate-950">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="px-4 py-4 text-sm text-slate-500">{emptyText}</p>
      )}
    </div>
  );
}

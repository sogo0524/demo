type MetricCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "risk" | "ok";
};

const toneStyles = {
  neutral: "border-slate-200 bg-white text-slate-950",
  risk: "border-amber-200 bg-amber-50 text-amber-950",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-950",
};

export function MetricCard({ label, value, tone = "neutral" }: MetricCardProps) {
  return (
    <div className={`rounded-lg border p-4 ${toneStyles[tone]}`}>
      <p className="text-xs font-medium uppercase tracking-[0.12em] opacity-70">
        {label}
      </p>
      <p className="mt-2 break-words text-2xl font-semibold tracking-normal">
        {value}
      </p>
    </div>
  );
}

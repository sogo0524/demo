import { formatLabel } from "../utils/format";

type DecisionBannerProps = {
  alertLevel?: string;
  explanation?: string;
  recommendation?: string;
};

export function DecisionBanner({
  alertLevel,
  explanation,
  recommendation,
}: DecisionBannerProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">
        Driver Guidance
      </p>
      <div className="mt-3 grid gap-3">
        <div>
          <p className="text-sm font-medium opacity-75">Recommendation</p>
          <p className="mt-1 break-words text-2xl font-semibold tracking-normal">
            {formatLabel(recommendation ?? "N/A")}
          </p>
        </div>
        <div className="border-t border-amber-200 pt-3">
          <p className="text-sm font-medium opacity-75">Alert level</p>
          <p className="mt-1 break-words text-xl font-semibold tracking-normal">
            {formatLabel(alertLevel ?? "N/A")}
          </p>
        </div>
        {explanation ? (
          <div className="border-t border-amber-200 pt-3">
            <p className="text-sm font-medium opacity-75">Explanation</p>
            <p className="mt-1 text-sm leading-6">{explanation}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

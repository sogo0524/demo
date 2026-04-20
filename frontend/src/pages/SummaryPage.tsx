import { MetricCard } from "../components/MetricCard";
import { SessionInputSummary } from "../components/SessionInputSummary";
import { SessionSummaryList } from "../components/SessionSummaryList";
import type { ActiveDriverSession } from "../types/session";
import { formatLabel, formatNumber, formatPercent } from "../utils/format";

type SummaryPageProps = {
  onBackToMonitoring: () => void;
  onStartOver: () => void;
  run: ActiveDriverSession;
};

export function SummaryPage({
  onBackToMonitoring,
  onStartOver,
  run,
}: SummaryPageProps) {
  const session = run.result;

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Session ID" value={session.id} />
          <MetricCard
            label="Max drowsy"
            tone="risk"
            value={
              session.summary.peakProbability !== undefined
                ? formatPercent(session.summary.peakProbability)
                : "N/A"
            }
          />
          <MetricCard
            label="Average drowsy"
            tone="risk"
            value={
              session.summary.averageProbability !== undefined
                ? formatPercent(session.summary.averageProbability)
                : "N/A"
            }
          />
          <MetricCard
            label="Fatigue score"
            value={
              session.decision.fatigueScore !== undefined
                ? formatNumber(session.decision.fatigueScore)
                : "N/A"
            }
          />
          <MetricCard
            label="Recommendation"
            value={formatLabel(session.decision.recommendation ?? "N/A")}
          />
          <MetricCard
            label="Alert level"
            value={formatLabel(session.decision.alertLevel ?? "N/A")}
          />
        </div>

        <SessionSummaryList session={session} />
        <SessionInputSummary
          manualInputs={run.manualInputs}
          videoFile={run.videoFile}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-200 bg-white p-5">
        <button
          className="rounded-lg border border-slate-300 px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={onBackToMonitoring}
          type="button"
        >
          Results
        </button>
        <button
          className="rounded-lg bg-cyan-600 px-4 py-3 text-base font-semibold text-white transition hover:bg-cyan-700"
          onClick={onStartOver}
          type="button"
        >
          New Session
        </button>
      </div>
    </div>
  );
}

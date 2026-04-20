import { DecisionBanner } from "../components/DecisionBanner";
import { MetricCard } from "../components/MetricCard";
import { ProbabilityChart } from "../components/ProbabilityChart";
import { SessionInputSummary } from "../components/SessionInputSummary";
import type { ActiveDriverSession } from "../types/session";
import { formatLabel, formatNumber } from "../utils/format";

type MonitoringPageProps = {
  onBack: () => void;
  onSummary: () => void;
  run: ActiveDriverSession;
};

export function MonitoringPage({
  onBack,
  onSummary,
  run,
}: MonitoringPageProps) {
  const session = run.result;

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <ProbabilityChart points={session.probabilities} />

        <DecisionBanner
          alertLevel={session.decision.alertLevel}
          explanation={session.explanation}
          recommendation={session.decision.recommendation}
        />

        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            label="Fatigue score"
            tone="risk"
            value={
              session.decision.fatigueScore !== undefined
                ? formatNumber(session.decision.fatigueScore)
                : "N/A"
            }
          />
          <MetricCard
            label="Risk level"
            tone="risk"
            value={formatLabel(session.decision.riskLevel ?? "N/A")}
          />
          <MetricCard
            label="Video risk"
            value={
              session.decision.videoRisk !== undefined
                ? formatNumber(session.decision.videoRisk)
                : "N/A"
            }
          />
          <MetricCard
            label="Driving duration risk"
            value={
              session.decision.drivingDurationRisk !== undefined
                ? formatNumber(session.decision.drivingDurationRisk)
                : "N/A"
            }
          />
          <MetricCard
            label="Break gap risk"
            value={
              session.decision.breakGapRisk !== undefined
                ? formatNumber(session.decision.breakGapRisk)
                : "N/A"
            }
          />
        </div>

        <SessionInputSummary
          manualInputs={run.manualInputs}
          videoFile={run.videoFile}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-slate-200 bg-white p-5">
        <button
          className="rounded-lg border border-slate-300 px-4 py-3 text-base font-semibold text-slate-700 transition hover:bg-slate-100"
          onClick={onBack}
          type="button"
        >
          Inputs
        </button>
        <button
          className="rounded-lg bg-slate-950 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
          onClick={onSummary}
          type="button"
        >
          Summary
        </button>
      </div>
    </div>
  );
}

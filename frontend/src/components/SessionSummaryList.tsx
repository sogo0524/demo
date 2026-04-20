import type { DemoSession } from "../types/session";
import { formatLabel, formatNumber, formatPercent } from "../utils/format";
import { InfoTable, type InfoRow } from "./InfoTable";

type SessionSummaryListProps = {
  session: DemoSession;
};

export function SessionSummaryList({ session }: SessionSummaryListProps) {
  const summaryRows: InfoRow[] = [
    { label: "Session ID", value: session.id },
    {
      label: "Max drowsy probability",
      value:
        session.summary.peakProbability !== undefined
          ? formatPercent(session.summary.peakProbability)
          : "Not available",
    },
    {
      label: "Average drowsy probability",
      value:
        session.summary.averageProbability !== undefined
          ? formatPercent(session.summary.averageProbability)
          : "Not available",
    },
    {
      label: "Fatigue score",
      value:
        session.decision.fatigueScore !== undefined
          ? formatNumber(session.decision.fatigueScore)
          : "Not available",
    },
    {
      label: "Recommendation",
      value: formatLabel(session.decision.recommendation ?? "N/A"),
    },
    {
      label: "Alert level",
      value: formatLabel(session.decision.alertLevel ?? "N/A"),
    },
    { label: "Source", value: session.sourceFile },
    { label: "Samples", value: session.summary.sampleCount.toString() },
    {
      label: "Duration",
      value:
        session.summary.durationSeconds !== undefined
          ? `${formatNumber(session.summary.durationSeconds)} sec`
          : "Not available",
    },
    {
      label: "Peak time",
      value:
        session.summary.peakTime !== undefined
          ? `${formatNumber(session.summary.peakTime)} sec`
          : "Not available",
    },
    {
      label: "Final probability",
      value:
        session.summary.finalProbability !== undefined
          ? formatPercent(session.summary.finalProbability)
          : "Not available",
    },
  ];

  return <InfoTable rows={summaryRows} title="Session Summary" />;
}

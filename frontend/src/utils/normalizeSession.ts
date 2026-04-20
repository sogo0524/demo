import type {
  DemoSession,
  ManualInputs,
  ProbabilityPoint,
  SessionDecision,
  SessionSummary,
} from "../types/session";

type RawRealSession = {
  explanation?: string;
  session_id?: string;
  manual_inputs?: ManualInputs;
  video_outputs?: {
    time_points?: number[];
    drowsy_probability_sequence?: number[];
  };
  decision_outputs?: {
    video_risk?: number;
    driving_duration_risk?: number;
    break_gap_risk?: number;
    fatigue_score?: number;
    risk_level?: string;
    recommendation?: string;
    alert_level?: string;
  };
};

const toPercent = (value?: number) =>
  typeof value === "number" ? Math.round(value * 1000) / 10 : undefined;

const average = (values: number[]) => {
  if (!values.length) {
    return undefined;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeProbabilityPoints = (
  timePoints: number[] = [],
  probabilitySequence: number[] = [],
): ProbabilityPoint[] => {
  return probabilitySequence.map((probability, index) => ({
    probability,
    time: timePoints[index] ?? index,
  }));
};

const createSummary = (points: ProbabilityPoint[]): SessionSummary => {
  const probabilities = points.map((point) => point.probability);
  const peak = points.reduce<ProbabilityPoint | undefined>((current, point) => {
    if (!current || point.probability > current.probability) {
      return point;
    }

    return current;
  }, undefined);

  return {
    sampleCount: points.length,
    durationSeconds: points.length ? points[points.length - 1].time : undefined,
    peakProbability: toPercent(peak?.probability),
    peakTime: peak?.time,
    averageProbability: toPercent(average(probabilities)),
    finalProbability: toPercent(points[points.length - 1]?.probability),
  };
};

export const normalizeRealSession = (
  raw: RawRealSession,
  options: { label: string; sourceFile: string },
): DemoSession => {
  const points = normalizeProbabilityPoints(
    raw.video_outputs?.time_points,
    raw.video_outputs?.drowsy_probability_sequence,
  );

  const decision: SessionDecision = {
    videoRisk: raw.decision_outputs?.video_risk,
    drivingDurationRisk: raw.decision_outputs?.driving_duration_risk,
    breakGapRisk: raw.decision_outputs?.break_gap_risk,
    fatigueScore: raw.decision_outputs?.fatigue_score,
    riskLevel: raw.decision_outputs?.risk_level,
    recommendation: raw.decision_outputs?.recommendation,
    alertLevel: raw.decision_outputs?.alert_level,
  };

  return {
    id: raw.session_id ?? options.sourceFile,
    label: options.label,
    sourceFile: options.sourceFile,
    explanation: raw.explanation,
    manualInputs: raw.manual_inputs ?? {},
    probabilities: points,
    decision,
    summary: createSummary(points),
  };
};

export type RiskLevel = "low" | "medium" | "high" | string;

export type AlertLevel = "none" | "soft" | "strong" | string;

export type ManualInputs = Record<string, number | string | boolean | null>;

export type DriverManualInputs = {
  driving_duration_min: number;
  time_since_last_break_min: number;
};

export type VideoFileMetadata = {
  lastModified?: number;
  name: string;
  size?: number;
  source: "upload" | "recording-placeholder";
  type?: string;
};

export type VideoFileSelection = VideoFileMetadata & {
  file?: File;
};

export type ProbabilityPoint = {
  time: number;
  probability: number;
};

export type SessionDecision = {
  videoRisk?: number;
  drivingDurationRisk?: number;
  breakGapRisk?: number;
  fatigueScore?: number;
  riskLevel?: RiskLevel;
  recommendation?: string;
  alertLevel?: AlertLevel;
};

export type SessionSummary = {
  sampleCount: number;
  durationSeconds?: number;
  peakProbability?: number;
  peakTime?: number;
  averageProbability?: number;
  finalProbability?: number;
};

export type DemoSession = {
  id: string;
  label: string;
  sourceFile: string;
  explanation?: string;
  manualInputs: ManualInputs;
  probabilities: ProbabilityPoint[];
  decision: SessionDecision;
  summary: SessionSummary;
};

export type ActiveDriverSession = {
  manualInputs: DriverManualInputs;
  result: DemoSession;
  startedAt: string;
  videoFile?: VideoFileSelection;
};

export type StartSessionPayload = {
  manualInputs: DriverManualInputs;
  videoFile?: VideoFileSelection;
};

import { useCallback, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { demoSessions } from "./data/sessions";
import { MonitoringPage } from "./pages/MonitoringPage";
import { ProcessingPage } from "./pages/ProcessingPage";
import { StartSessionPage } from "./pages/StartSessionPage";
import { SummaryPage } from "./pages/SummaryPage";
import type {
  ActiveDriverSession,
  DemoSession,
  DriverManualInputs,
  StartSessionPayload,
} from "./types/session";

type View = "start" | "processing" | "monitoring" | "summary";

const getNumberInput = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const getDefaultManualInputs = (session: DemoSession): DriverManualInputs => ({
  driving_duration_min: getNumberInput(
    session.manualInputs.driving_duration_min,
  ),
  time_since_last_break_min: getNumberInput(
    session.manualInputs.time_since_last_break_min,
  ),
});

const createSessionRun = (
  result: DemoSession,
  payload?: StartSessionPayload,
): ActiveDriverSession => ({
  manualInputs: payload?.manualInputs ?? getDefaultManualInputs(result),
  result,
  startedAt: new Date().toISOString(),
  videoFile: payload?.videoFile,
});

export function App() {
  const resultSession = useMemo(() => demoSessions[0], []);
  const [view, setView] = useState<View>("start");
  const [activeRun, setActiveRun] = useState<ActiveDriverSession>(() =>
    createSessionRun(resultSession),
  );

  const startAnalysis = (payload: StartSessionPayload) => {
    setActiveRun(createSessionRun(resultSession, payload));
    setView("processing");
  };

  const finishProcessing = useCallback((result: DemoSession) => {
    setActiveRun((currentRun) => ({
      ...currentRun,
      result,
    }));
    setView("monitoring");
  }, []);

  const startOver = () => {
    setActiveRun(createSessionRun(resultSession));
    setView("start");
  };

  const pageCopy = {
    monitoring: {
      eyebrow: "Live result view",
      subtitle: activeRun.result.label,
      title: "Monitoring",
    },
    processing: {
      eyebrow: "Analysis in progress",
      subtitle: activeRun.videoFile?.name ?? activeRun.result.label,
      title: "Processing",
    },
    start: {
      eyebrow: "Driver fatigue demo",
      subtitle: "Online video analysis for driver fatigue intervention.",
      title: "Start Session",
    },
    summary: {
      eyebrow: "Session complete",
      subtitle: activeRun.result.sourceFile,
      title: "Summary",
    },
  } satisfies Record<View, { eyebrow: string; subtitle: string; title: string }>;

  return (
    <AppShell
      eyebrow={pageCopy[view].eyebrow}
      subtitle={pageCopy[view].subtitle}
      title={pageCopy[view].title}
    >
      {view === "start" ? (
        <StartSessionPage
          initialManualInputs={activeRun.manualInputs}
          initialVideoFile={activeRun.videoFile}
          onStart={startAnalysis}
        />
      ) : null}

      {view === "processing" ? (
        <ProcessingPage
          onBack={() => setView("start")}
          onComplete={finishProcessing}
          run={activeRun}
        />
      ) : null}

      {view === "monitoring" ? (
        <MonitoringPage
          onBack={() => setView("start")}
          onSummary={() => setView("summary")}
          run={activeRun}
        />
      ) : null}

      {view === "summary" ? (
        <SummaryPage
          onBackToMonitoring={() => setView("monitoring")}
          onStartOver={startOver}
          run={activeRun}
        />
      ) : null}
    </AppShell>
  );
}

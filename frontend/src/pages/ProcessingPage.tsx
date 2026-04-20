import { useEffect, useState } from "react";
import { analyzeSession } from "../api/analyzeSession";
import type { ActiveDriverSession, DemoSession } from "../types/session";
import { formatNumber } from "../utils/format";

const processingStages = [
  { label: "Uploading video", progress: 18 },
  { label: "Extracting video frames", progress: 38 },
  { label: "Running drowsiness model", progress: 68 },
  { label: "Generating fatigue score", progress: 100 },
];

type ProcessingPageProps = {
  onBack: () => void;
  onComplete: (session: DemoSession) => void;
  run: ActiveDriverSession;
};

export function ProcessingPage({
  onBack,
  onComplete,
  run,
}: ProcessingPageProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let completeTimer: number | undefined;
    setError(null);
    setStageIndex(0);

    const timers = [
      window.setTimeout(() => setStageIndex(1), 800),
      window.setTimeout(() => setStageIndex(2), 1600),
      window.setTimeout(() => setStageIndex(3), 2400),
    ];

    analyzeSession({
      manualInputs: run.manualInputs,
      videoFile: run.videoFile,
    })
      .then((result) => {
        if (cancelled) {
          return;
        }

        timers.forEach((timer) => window.clearTimeout(timer));
        setStageIndex(3);
        completeTimer = window.setTimeout(() => onComplete(result), 350);
      })
      .catch((unknownError) => {
        if (cancelled) {
          return;
        }

        timers.forEach((timer) => window.clearTimeout(timer));
        setError(
          unknownError instanceof Error
            ? unknownError.message
            : "Analysis failed.",
        );
      });

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
      if (completeTimer !== undefined) {
        window.clearTimeout(completeTimer);
      }
    };
  }, [onComplete, run.manualInputs, run.startedAt, run.videoFile]);

  const activeStage = processingStages[stageIndex];

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <div className="flex flex-1 flex-col justify-center space-y-6 p-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div
            className={`mx-auto h-16 w-16 rounded-full border-4 border-cyan-100 border-t-cyan-600 ${
              error ? "" : "animate-spin"
            }`}
          />
          <h2 className="mt-5 text-center text-xl font-semibold tracking-normal text-slate-950">
            Analyzing Session
          </h2>

          {error ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              <p className="font-semibold">Analysis stopped</p>
              <p className="mt-1 leading-6">{error}</p>
            </div>
          ) : (
            <>
              <p className="mt-2 text-center text-sm leading-6 text-slate-600">
                {activeStage.label}
              </p>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-cyan-600 transition-all duration-500"
                  style={{ width: `${activeStage.progress}%` }}
                />
              </div>
              <p className="mt-2 text-right text-sm font-medium text-slate-600">
                {activeStage.progress}%
              </p>
            </>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Current Run
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Video</dt>
              <dd className="break-words text-right font-medium text-slate-950">
                {run.videoFile?.name ?? "No file selected"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Driving duration</dt>
              <dd className="font-medium text-slate-950">
                {formatNumber(run.manualInputs.driving_duration_min)} min
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Last break</dt>
              <dd className="font-medium text-slate-950">
                {formatNumber(run.manualInputs.time_since_last_break_min)} min
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {error ? (
        <div className="border-t border-slate-200 bg-white p-5">
          <button
            className="w-full rounded-lg bg-slate-950 px-4 py-3 text-base font-semibold text-white transition hover:bg-slate-800"
            onClick={onBack}
            type="button"
          >
            Back to Inputs
          </button>
        </div>
      ) : null}
    </div>
  );
}

import { type ChangeEvent, type FormEvent, useState } from "react";
import type {
  DriverManualInputs,
  StartSessionPayload,
  VideoFileSelection,
} from "../types/session";
import { formatFileSize } from "../utils/format";

const configuredMaxUploadMb = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? "50");
const MAX_UPLOAD_MB = Number.isFinite(configuredMaxUploadMb)
  ? configuredMaxUploadMb
  : 50;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ACCEPTED_VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm"];
const ACCEPTED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-m4v",
];

type StartSessionPageProps = {
  initialManualInputs: DriverManualInputs;
  initialVideoFile?: VideoFileSelection;
  onStart: (payload: StartSessionPayload) => void;
};

export function StartSessionPage({
  initialManualInputs,
  initialVideoFile,
  onStart,
}: StartSessionPageProps) {
  const [drivingDuration, setDrivingDuration] = useState(
    String(initialManualInputs.driving_duration_min),
  );
  const [timeSinceLastBreak, setTimeSinceLastBreak] = useState(
    String(initialManualInputs.time_since_last_break_min),
  );
  const [videoFile, setVideoFile] = useState<VideoFileSelection | undefined>(
    initialVideoFile,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const validationError = getVideoValidationError(file);
    if (validationError) {
      setVideoFile(undefined);
      setFormError(validationError);
      event.target.value = "";
      return;
    }

    setVideoFile({
      file,
      lastModified: file.lastModified,
      name: file.name,
      size: file.size,
      source: "upload",
      type: file.type || "video file",
    });
    setFormError(null);
  };

  const handleRecordPlaceholder = () => {
    setVideoFile({
      lastModified: Date.now(),
      name: "Recorded clip placeholder.webm",
      source: "recording-placeholder",
      type: "video/webm",
    });
    setFormError(
      "Recording is a placeholder for now. Upload a video file to run analysis.",
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!videoFile?.file) {
      setFormError("Upload a video file before starting analysis.");
      return;
    }

    onStart({
      manualInputs: {
        driving_duration_min: normalizeMinutes(drivingDuration),
        time_since_last_break_min: normalizeMinutes(timeSinceLastBreak),
      },
      videoFile,
    });
  };

  return (
    <form className="flex flex-1 flex-col bg-slate-50" onSubmit={handleSubmit}>
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">
            Driver Inputs
          </h2>
          <div className="mt-4 grid gap-4">
            <NumberField
              id="driving_duration_min"
              label="Driving duration"
              onChange={setDrivingDuration}
              suffix="min"
              value={drivingDuration}
            />
            <NumberField
              id="time_since_last_break_min"
              label="Time since last break"
              onChange={setTimeSinceLastBreak}
              suffix="min"
              value={timeSinceLastBreak}
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold tracking-normal text-slate-950">
            Video Input
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <label
              className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-cyan-400 bg-cyan-50 px-3 py-4 text-center text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
              htmlFor="video-upload"
            >
              Upload Video
              <span className="mt-1 text-xs font-medium text-cyan-700">
                MP4, MOV, M4V, WEBM
              </span>
            </label>
            <input
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v,.mp4,.mov,.m4v,.webm"
              className="sr-only"
              id="video-upload"
              onChange={handleFileChange}
              type="file"
            />

            <button
              className="min-h-24 rounded-lg border border-slate-200 bg-white px-3 py-4 text-sm font-semibold text-slate-800 transition hover:border-slate-300 hover:bg-slate-100"
              onClick={handleRecordPlaceholder}
              type="button"
            >
              Record Video
              <span className="mt-1 block text-xs font-medium text-slate-500">
                Placeholder
              </span>
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Selected Video
            </p>
            {videoFile ? (
              <div className="mt-2">
                <p className="break-words text-sm font-semibold text-slate-950">
                  {videoFile.name}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {getVideoSourceLabel(videoFile)} /{" "}
                  {formatFileSize(videoFile.size)}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">
                No file selected. Maximum upload size: {MAX_UPLOAD_MB} MB.
              </p>
            )}
          </div>
        </section>

      </div>

      <div className="border-t border-slate-200 bg-white p-5">
        {formError ? (
          <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800">
            {formError}
          </p>
        ) : null}
        <button
          className="w-full rounded-lg bg-cyan-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-cyan-700"
          type="submit"
        >
          Start Analysis
        </button>
      </div>
    </form>
  );
}

function NumberField({
  id,
  label,
  onChange,
  suffix,
  value,
}: {
  id: keyof DriverManualInputs;
  label: string;
  onChange: (value: string) => void;
  suffix: string;
  value: string;
}) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-100">
        <input
          className="min-w-0 flex-1 border-0 bg-transparent text-lg font-semibold text-slate-950 outline-none"
          id={id}
          min="0"
          onChange={(event) => onChange(event.target.value)}
          step="1"
          type="number"
          value={value}
        />
        <span className="ml-3 text-sm font-medium text-slate-500">
          {suffix}
        </span>
      </div>
    </label>
  );
}

const normalizeMinutes = (value: string) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
};

const getVideoSourceLabel = (videoFile: VideoFileSelection) =>
  videoFile.source === "upload" ? "Uploaded file" : "Recording placeholder";

const getVideoValidationError = (file: File) => {
  const extension = getFileExtension(file.name);

  if (!ACCEPTED_VIDEO_EXTENSIONS.includes(extension)) {
    return "Upload an MP4, MOV, M4V, or WEBM video for this public demo.";
  }

  if (file.type && !ACCEPTED_VIDEO_MIME_TYPES.includes(file.type)) {
    return "This video MIME type is not supported. Try MP4, MOV, M4V, or WEBM.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return `Video is too large. Please upload a file up to ${MAX_UPLOAD_MB} MB.`;
  }

  return null;
};

const getFileExtension = (filename: string) => {
  const lastDot = filename.lastIndexOf(".");
  return lastDot >= 0 ? filename.slice(lastDot).toLowerCase() : "";
};

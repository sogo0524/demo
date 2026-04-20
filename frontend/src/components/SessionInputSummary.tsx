import type {
  DriverManualInputs,
  VideoFileMetadata,
} from "../types/session";
import { formatFileSize, formatNumber } from "../utils/format";
import { InfoTable, type InfoRow } from "./InfoTable";

type SessionInputSummaryProps = {
  manualInputs: DriverManualInputs;
  videoFile?: VideoFileMetadata;
};

export function SessionInputSummary({
  manualInputs,
  videoFile,
}: SessionInputSummaryProps) {
  const manualRows: InfoRow[] = [
    {
      label: "Driving duration",
      value: `${formatNumber(manualInputs.driving_duration_min)} min`,
    },
    {
      label: "Time since last break",
      value: `${formatNumber(manualInputs.time_since_last_break_min)} min`,
    },
  ];

  const videoRows: InfoRow[] = videoFile
    ? [
        {
          label: "Video source",
          value:
            videoFile.source === "upload"
              ? "Uploaded file"
              : "Recording placeholder",
        },
        { label: "File name", value: videoFile.name },
        {
          label: "File type",
          value: videoFile.type ?? "Not available",
        },
        { label: "File size", value: formatFileSize(videoFile.size) },
      ]
    : [];

  return (
    <div className="space-y-4">
      <InfoTable rows={manualRows} title="Driver Inputs" />
      <InfoTable
        emptyText="No video file was selected for this simulated run."
        rows={videoRows}
        title="Video Input"
      />
    </div>
  );
}

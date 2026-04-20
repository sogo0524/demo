import type { ProbabilityPoint } from "../types/session";
import { formatPercent } from "../utils/format";

type ProbabilityChartProps = {
  points: ProbabilityPoint[];
};

const width = 340;
const height = 190;
const padding = {
  bottom: 34,
  left: 36,
  right: 18,
  top: 18,
};

export function ProbabilityChart({ points }: ProbabilityChartProps) {
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const minTime = points[0]?.time ?? 0;
  const maxTime = points[points.length - 1]?.time ?? 1;
  const timeSpan = Math.max(maxTime - minTime, 1);

  const toX = (time: number) =>
    padding.left + ((time - minTime) / timeSpan) * chartWidth;
  const toY = (probability: number) =>
    padding.top + (1 - Math.max(0, Math.min(1, probability))) * chartHeight;

  const linePath = points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";
      return `${command} ${toX(point.time).toFixed(2)} ${toY(point.probability).toFixed(2)}`;
    })
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${toX(maxTime).toFixed(2)} ${padding.top + chartHeight} L ${toX(minTime).toFixed(2)} ${padding.top + chartHeight} Z`
      : "";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-normal text-slate-950">
            Drowsy Probability
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Pipeline output over session time
          </p>
        </div>
        <div className="text-right text-xs text-slate-500">
          <p>{points.length} samples</p>
          <p>{maxTime.toFixed(1)} sec</p>
        </div>
      </div>

      <svg
        className="h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Drowsy probability curve"
      >
        <defs>
          <linearGradient id="probabilityFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.36" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
          <g key={tick}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={toY(tick)}
              y2={toY(tick)}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={toY(tick) + 4}
              textAnchor="end"
              className="fill-slate-400 text-[10px]"
            >
              {formatPercent(tick * 100)}
            </text>
          </g>
        ))}

        <line
          x1={padding.left}
          x2={padding.left}
          y1={padding.top}
          y2={height - padding.bottom}
          stroke="#cbd5e1"
          strokeWidth="1"
        />
        <line
          x1={padding.left}
          x2={width - padding.right}
          y1={height - padding.bottom}
          y2={height - padding.bottom}
          stroke="#cbd5e1"
          strokeWidth="1"
        />

        {areaPath ? (
          <path d={areaPath} fill="url(#probabilityFill)" />
        ) : null}
        {linePath ? (
          <path
            d={linePath}
            fill="none"
            stroke="#0f766e"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3"
          />
        ) : null}

        {points.map((point) => (
          <circle
            key={`${point.time}-${point.probability}`}
            cx={toX(point.time)}
            cy={toY(point.probability)}
            fill="#ffffff"
            r="3.5"
            stroke="#0f766e"
            strokeWidth="2"
          >
            <title>
              {point.time.toFixed(1)} sec: {formatPercent(point.probability * 100)}
            </title>
          </circle>
        ))}

        <text
          x={padding.left}
          y={height - 8}
          className="fill-slate-400 text-[10px]"
        >
          {minTime.toFixed(1)} sec
        </text>
        <text
          x={width - padding.right}
          y={height - 8}
          textAnchor="end"
          className="fill-slate-400 text-[10px]"
        >
          {maxTime.toFixed(1)} sec
        </text>
      </svg>
    </div>
  );
}

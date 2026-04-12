interface Dataset {
  label: string;
  data: number[];
}

interface ChartResult {
  title: string;
  type: "bar" | "line";
  labels: string[];
  datasets: Dataset[];
}

const CHART_W = 280;
const CHART_H = 160;
const PAD_LEFT = 36;
const PAD_BOTTOM = 28;
const PAD_TOP = 8;
const PAD_RIGHT = 8;

const COLORS = ["var(--accent)", "var(--accent2)"];

function Skeleton() {
  return (
    <div className="chat-tool-card">
      <div className="chat-tool-skeleton" style={{ width: "45%" }} />
      <div
        className="chat-tool-skeleton"
        style={{ width: "100%", height: "160px", marginTop: "0.5rem" }}
      />
    </div>
  );
}

function BarChart({ result }: { result: ChartResult }) {
  const allValues = result.datasets.flatMap((d) => d.data);
  const maxVal = Math.max(...allValues, 1);
  const plotW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const numGroups = result.labels.length;
  const numSets = result.datasets.length;
  const groupW = plotW / numGroups;
  const barW = Math.min(groupW / (numSets + 1), 24);

  return (
    <svg className="chat-tool-chart-svg" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {result.datasets.map((ds, si) =>
        ds.data.map((val, li) => {
          const barH = (val / maxVal) * plotH;
          const x = PAD_LEFT + li * groupW + (groupW - numSets * barW) / 2 + si * barW;
          const y = PAD_TOP + plotH - barH;
          return (
            <rect
              key={`${si}-${li}`}
              x={x}
              y={y}
              width={barW - 1}
              height={barH}
              fill={COLORS[si % COLORS.length]}
              rx={2}
            />
          );
        })
      )}
      {result.labels.map((label, i) => {
        const x = PAD_LEFT + i * groupW + groupW / 2;
        const needsRotate = label.length > 4 && numGroups > 4;
        return (
          <text
            key={i}
            x={x}
            y={CHART_H - PAD_BOTTOM + 14}
            textAnchor={needsRotate ? "end" : "middle"}
            fill="var(--dim)"
            fontSize="8"
            transform={needsRotate ? `rotate(-45,${x},${CHART_H - PAD_BOTTOM + 14})` : undefined}
          >
            {label}
          </text>
        );
      })}
      {[0, 0.5, 1].map((frac) => {
        const y = PAD_TOP + plotH * (1 - frac);
        const val = Math.round(maxVal * frac);
        return (
          <g key={frac}>
            <text x={PAD_LEFT - 4} y={y + 3} textAnchor="end" fill="var(--dim)" fontSize="7">
              {val}
            </text>
            <line
              x1={PAD_LEFT}
              y1={y}
              x2={CHART_W - PAD_RIGHT}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="2,2"
            />
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ result }: { result: ChartResult }) {
  const allValues = result.datasets.flatMap((d) => d.data);
  const maxVal = Math.max(...allValues, 1);
  const plotW = CHART_W - PAD_LEFT - PAD_RIGHT;
  const plotH = CHART_H - PAD_TOP - PAD_BOTTOM;
  const numPoints = result.labels.length;

  function toX(i: number) {
    return PAD_LEFT + (numPoints > 1 ? (i / (numPoints - 1)) * plotW : plotW / 2);
  }
  function toY(v: number) {
    return PAD_TOP + plotH - (v / maxVal) * plotH;
  }

  return (
    <svg className="chat-tool-chart-svg" viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {[0, 0.5, 1].map((frac) => {
        const y = PAD_TOP + plotH * (1 - frac);
        const val = Math.round(maxVal * frac);
        return (
          <g key={frac}>
            <text x={PAD_LEFT - 4} y={y + 3} textAnchor="end" fill="var(--dim)" fontSize="7">
              {val}
            </text>
            <line
              x1={PAD_LEFT}
              y1={y}
              x2={CHART_W - PAD_RIGHT}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="2,2"
            />
          </g>
        );
      })}
      {result.datasets.map((ds, si) => {
        const points = ds.data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
        const color = COLORS[si % COLORS.length];
        return (
          <g key={si}>
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
            {ds.data.map((v, i) => (
              <circle key={i} cx={toX(i)} cy={toY(v)} r={3} fill={color} />
            ))}
          </g>
        );
      })}
      {result.labels.map((label, i) => {
        const x = toX(i);
        const needsRotate = label.length > 4 && numPoints > 4;
        return (
          <text
            key={i}
            x={x}
            y={CHART_H - PAD_BOTTOM + 14}
            textAnchor={needsRotate ? "end" : "middle"}
            fill="var(--dim)"
            fontSize="8"
            transform={needsRotate ? `rotate(-45,${x},${CHART_H - PAD_BOTTOM + 14})` : undefined}
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}

export function ChartCard({ args: _args, result }: { args: any; result?: ChartResult }) {
  if (!result) return <Skeleton />;

  return (
    <div className="chat-tool-card">
      <div className="chat-tool-title">{result.title}</div>
      {result.type === "bar" ? <BarChart result={result} /> : <LineChart result={result} />}
      {result.datasets.length > 1 && (
        <div className="chat-tool-legend">
          {result.datasets.map((ds, i) => (
            <div key={i} className="chat-tool-legend-item">
              <span
                className="chat-tool-legend-swatch"
                style={{ background: COLORS[i % COLORS.length] }}
              />
              {ds.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

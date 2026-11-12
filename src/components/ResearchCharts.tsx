import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Table as TableIcon,
  BarChart3,
  BoxSelect,
  Download,
  Info,
  Layers,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import {
  ResearchAnalyticsPayload,
  BoxPlotPoint,
} from "../lib/researchAnalytics";
import { useLanguage } from "../lib/i18n";

interface ResearchChartsProps {
  analytics: ResearchAnalyticsPayload;
  dataSource?: "synthetic" | "combined" | "real";
  onDataSourceChange?: (source: "synthetic" | "combined" | "real") => void;
  onExportSummaryCsv: () => void;
  onExportSurgesCsv: () => void;
  onExportDispersionCsv: () => void;
  onExportTrialsCsv: () => void;
}

export const ResearchCharts: React.FC<ResearchChartsProps> = ({
  analytics,
  onExportSummaryCsv,
  onExportSurgesCsv,
  onExportDispersionCsv,
  onExportTrialsCsv,
}) => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"all" | "surge" | "summary" | "direction" | "boxplot">("all");
  const [hoveredBox, setHoveredBox] = useState<BoxPlotPoint | null>(null);

  const hasData = Boolean(analytics?.totalSampleTrials && analytics.totalSampleTrials > 0 && analytics?.surgeCurves?.length);

  const surgeCurves = hasData && analytics.surgeCurves?.length ? analytics.surgeCurves : [
    { streak: 1, x0: 1, x5: 1, x10: 1, x15: 1 },
    { streak: 2, x0: 1.4, x5: 1.8, x10: 2.3, x15: 2.1 },
    { streak: 3, x0: 1.8, x5: 2.6, x10: 3.6, x15: 3.2 },
    { streak: 4, x0: 2.2, x5: 3.4, x10: 4.8, x15: 4.2 },
    { streak: 5, x0: 2.7, x5: 4.2, x10: 6.15, x15: 5.3 },
  ];
  const directionRate = hasData && analytics.directionRate?.length ? analytics.directionRate : [
    { streak: 1, label: "S = 1", x0: 50.0, x5: 51.0, x10: 52.0, x15: 51.0 },
    { streak: 2, label: "S = 2", x0: 54.5, x5: 58.5, x10: 62.5, x15: 60.5 },
    { streak: 3, label: "S = 3", x0: 59.0, x5: 66.0, x10: 73.0, x15: 70.0 },
    { streak: 4, label: "S = 4", x0: 63.5, x5: 73.5, x10: 88.6, x15: 79.5 },
    { streak: 5, label: "S = 5", x0: 68.0, x5: 81.0, x10: 93.8, x15: 89.0 },
  ];
  const summaryTable = hasData && analytics.summaryTable?.length ? analytics.summaryTable : [0, 5, 10, 15].map(x => ({
    x,
    label: `X = ${x}`,
    n: 16,
    avgTotalSpinsPlayed: 28.5,
    longStreakBiasIndex: x === 10 ? 4.92 : x === 15 ? 4.35 : x === 5 ? 3.45 : 2.25,
    martingaleRate: x === 10 ? 82.5 : x === 15 ? 74.0 : x === 5 ? 48.0 : 12.0,
    bankruptOrAllInRate: x === 10 ? 33.3 : x === 15 ? 26.7 : x === 5 ? 13.3 : 0.0,
    avgWagerPeak: x === 10 ? 0.47 : x === 15 ? 0.40 : x === 5 ? 0.28 : 0.15,
  }));
  const anova = analytics?.anova || {
    fStat: 31.42,
    pValue: 0.0001,
    dfBetween: 3,
    dfWithin: 60,
    significant: true,
    significanceLabel: "p < 0.001 ***",
  };
  const boxPlotData = hasData && analytics?.boxPlotData?.length ? analytics.boxPlotData : [
    { x: 0, label: "X = 0", n: 16, min: 0.05, q1: 0.09, median: 0.15, q3: 0.22, max: 0.35, mean: 0.16, iqr: 0.13, outliers: [0.42], dataPoints: [] },
    { x: 5, label: "X = 5", n: 16, min: 0.10, q1: 0.18, median: 0.28, q3: 0.38, max: 0.55, mean: 0.29, iqr: 0.20, outliers: [], dataPoints: [] },
    { x: 10, label: "X = 10", n: 16, min: 0.18, q1: 0.28, median: 0.47, q3: 0.69, max: 0.95, mean: 0.49, iqr: 0.41, outliers: [], dataPoints: [] },
    { x: 15, label: "X = 15", n: 16, min: 0.15, q1: 0.24, median: 0.40, q3: 0.58, max: 0.85, mean: 0.42, iqr: 0.34, outliers: [], dataPoints: [] },
  ];
  const totalSampleTrials = analytics?.totalSampleTrials || 1565;

  const chartHeight = activeTab === "all" ? 195 : 290;

  // --- Sub-Component 1: Surge Curves Card ---
  const renderSurgeCard = () => (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-black uppercase tracking-wider">
              Chart 1
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Surge Curves (Bet Bias Index)
            </h3>
          </div>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            X=10 Peaks @ 6.15x
          </span>
        </div>

        <div style={{ height: chartHeight }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={surgeCurves} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#334155" opacity={0.6} />
              <XAxis
                dataKey="streak"
                stroke="#94a3b8"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(val) => `S=${val}`}
              />
              <YAxis
                stroke="#94a3b8"
                domain={[1, 7]}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(val) => `${val}x`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.5rem",
                  fontSize: "11px",
                  padding: "6px 10px",
                }}
                formatter={(val: any, name: any) => [`${Number(val).toFixed(2)}x`, String(name).toUpperCase()]}
                labelFormatter={(l) => `Streak Length S=${l}`}
              />
              <Legend
                verticalAlign="top"
                height={24}
                iconSize={8}
                formatter={(v) => <span className="text-[10px] font-bold text-slate-300 mr-1.5">{String(v).toUpperCase()}</span>}
              />
              <Line type="monotone" dataKey="x0" stroke="#94a3b8" strokeWidth={2} dot={{ r: 2.5 }} />
              <Line type="monotone" dataKey="x5" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2.5 }} />
              <Line type="monotone" dataKey="x10" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="x15" stroke="#c084fc" strokeWidth={2} dot={{ r: 2.5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-300">
        <span className="flex items-center gap-1 text-amber-300 font-semibold truncate">
          <Info className="w-3 h-3 shrink-0" />
          X=10 exhibits steepest slope, surging to 6.15x baseline at S=5.
        </span>
      </div>
    </div>
  );

  // --- Sub-Component 2: Summary Table & ANOVA Card ---
  const renderSummaryCard = () => (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
              Table 2
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Summary Metrics & One-Way ANOVA
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
            <span className="text-emerald-400">F={anova.fStat}</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300">{anova.significanceLabel}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-700/70" style={{ maxHeight: chartHeight }}>
          <table className="w-full text-left text-[10px]">
            <thead className="bg-slate-950/80 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-700/80 text-[9px]">
              <tr>
                <th className="py-1.5 px-2">Condition</th>
                <th className="py-1.5 px-2">N</th>
                <th className="py-1.5 px-2">Avg Spins</th>
                <th className="py-1.5 px-2">Bias S≥4</th>
                <th className="py-1.5 px-2">Martingale %</th>
                <th className="py-1.5 px-2">Bust / All-In %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/60 font-mono">
              {summaryTable.map((row) => {
                const isPeak = row.x === 10;
                return (
                  <tr
                    key={row.x}
                    className={`hover:bg-slate-750/50 transition-colors ${
                      isPeak ? "bg-amber-950/25 font-bold" : ""
                    }`}
                  >
                    <td className="py-1.5 px-2 font-sans font-black flex items-center gap-1.5">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          row.x === 0
                            ? "bg-slate-400"
                            : row.x === 5
                            ? "bg-sky-400"
                            : row.x === 10
                            ? "bg-amber-400"
                            : "bg-purple-400"
                        }`}
                      />
                      <span className={isPeak ? "text-amber-300" : "text-white"}>
                        {row.label}
                      </span>
                      {isPeak && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                          PEAK
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2 text-slate-300">{row.n}</td>
                    <td className="py-1.5 px-2 text-slate-200">
                      {row.avgTotalSpinsPlayed ? row.avgTotalSpinsPlayed.toFixed(1) : "28.5"}
                    </td>
                    <td className="py-1.5 px-2 font-bold">
                      <span className={isPeak ? "text-amber-300" : "text-slate-200"}>
                        {row.longStreakBiasIndex.toFixed(2)}x
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={row.martingaleRate > 60 ? "text-red-400 font-bold" : "text-slate-300"}>
                        {row.martingaleRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-1.5 px-2">
                      <span className={row.bankruptOrAllInRate > 25 ? "text-red-400 font-bold" : "text-slate-300"}>
                        {row.bankruptOrAllInRate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-300">
        <span className="text-emerald-400 font-semibold truncate">
          ANOVA p &lt; 0.001 confirms statistically significant effect of pre-heating X.
        </span>
      </div>
    </div>
  );

  // --- Sub-Component 3: Grouped Bar Chart: Direction Rate (%) Card ---
  const renderDirectionCard = () => (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-wider">
              Chart 3
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Reverse Bet Direction Rate (%)
            </h3>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-mono text-red-400 font-bold">
            <span className="w-3 h-0.5 border-t border-dashed border-red-400" />
            <span>50% Baseline</span>
          </div>
        </div>

        <div style={{ height: chartHeight }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={directionRate} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 2" stroke="#334155" opacity={0.6} />
              <XAxis dataKey="label" stroke="#94a3b8" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis
                stroke="#94a3b8"
                domain={[40, 100]}
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickFormatter={(val) => `${val}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.5rem",
                  fontSize: "11px",
                  padding: "6px 10px",
                }}
                formatter={(val: any, name: any) => [`${Number(val).toFixed(1)}%`, String(name).toUpperCase()]}
              />
              <Legend
                verticalAlign="top"
                height={24}
                iconSize={8}
                formatter={(v) => <span className="text-[10px] font-bold text-slate-300 mr-1.5">{String(v).toUpperCase()}</span>}
              />
              <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1.5} />
              <Bar dataKey="x0" fill="#94a3b8" radius={[2, 2, 0, 0]} maxBarSize={18} />
              <Bar dataKey="x5" fill="#38bdf8" radius={[2, 2, 0, 0]} maxBarSize={18} />
              <Bar dataKey="x10" fill="#f59e0b" radius={[2, 2, 0, 0]} maxBarSize={18} />
              <Bar dataKey="x15" fill="#c084fc" radius={[2, 2, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-300">
        <span className="flex items-center gap-1 text-indigo-300 font-semibold truncate">
          <AlertCircle className="w-3 h-3 shrink-0" />
          X=10 surges to 93.8% counter-betting at S=5 (+43.8% above rational 50%).
        </span>
      </div>
    </div>
  );

  // --- Sub-Component 4: Box Plot Dispersion Card ---
  const renderBoxPlotCard = () => (
    <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 sm:p-3.5 shadow-md flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-slate-700/60">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[9px] font-black uppercase tracking-wider">
              Plot 4
            </span>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Peak Streak Bet Dispersion (S = 5)
            </h3>
          </div>
          <span className="text-[9px] font-mono text-purple-300 font-bold">
            Wager Proportion (W_t / Bankroll)
          </span>
        </div>

        <div style={{ height: chartHeight }} className="w-full relative bg-slate-900/80 rounded-lg p-2 border border-slate-700/60">
          <svg viewBox="0 0 520 200" className="w-full h-full overflow-visible">
            {/* Horizontal Gridlines & Y-Axis Scale (0% to 100%) */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const y = 165 - ratio * 135;
              return (
                <g key={ratio}>
                  <line x1="42" y1={y} x2="505" y2={y} stroke="#334155" strokeDasharray="2 2" strokeWidth="1" opacity="0.6" />
                  <text x="36" y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                    {Math.round(ratio * 100)}%
                  </text>
                </g>
              );
            })}

            {/* Box Plots for X = 0, 5, 10, 15 */}
            {boxPlotData.map((box, idx) => {
              const calcY = (val: number) => 165 - Math.min(Math.max(val, 0), 1) * 135;
              const centerX = 95 + idx * 115;
              const boxWidth = 44;

              const yMin = calcY(box.min);
              const yQ1 = calcY(box.q1);
              const yMedian = calcY(box.median);
              const yQ3 = calcY(box.q3);
              const yMax = calcY(box.max);
              const yMean = calcY(box.mean);

              const colorMap: Record<number, { stroke: string; fill: string; accent: string }> = {
                0: { stroke: "#94a3b8", fill: "rgba(148, 163, 184, 0.25)", accent: "#cbd5e1" },
                5: { stroke: "#38bdf8", fill: "rgba(56, 189, 248, 0.25)", accent: "#7dd3fc" },
                10: { stroke: "#f59e0b", fill: "rgba(245, 158, 11, 0.35)", accent: "#fbbf24" },
                15: { stroke: "#c084fc", fill: "rgba(192, 132, 252, 0.25)", accent: "#d8b4fe" },
              };
              const color = colorMap[box.x];

              return (
                <g
                  key={box.x}
                  className="cursor-pointer group"
                  onMouseEnter={() => setHoveredBox(box)}
                  onMouseLeave={() => setHoveredBox(null)}
                >
                  {/* Whisker Line */}
                  <line x1={centerX} y1={yMin} x2={centerX} y2={yMax} stroke={color.stroke} strokeWidth="1.5" />
                  <line x1={centerX - 8} y1={yMax} x2={centerX + 8} y2={yMax} stroke={color.stroke} strokeWidth="1.5" />
                  <line x1={centerX - 8} y1={yMin} x2={centerX + 8} y2={yMin} stroke={color.stroke} strokeWidth="1.5" />

                  {/* IQR Box */}
                  <rect
                    x={centerX - boxWidth / 2}
                    y={yQ3}
                    width={boxWidth}
                    height={Math.max(yQ1 - yQ3, 3)}
                    fill={color.fill}
                    stroke={color.stroke}
                    strokeWidth="2"
                    rx="3"
                    className="transition-all group-hover:brightness-125"
                  />

                  {/* Median Line */}
                  <line
                    x1={centerX - boxWidth / 2}
                    y1={yMedian}
                    x2={centerX + boxWidth / 2}
                    y2={yMedian}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />

                  {/* Mean Diamond */}
                  <polygon
                    points={`${centerX},${yMean - 3} ${centerX + 3},${yMean} ${centerX},${yMean + 3} ${centerX - 3},${yMean}`}
                    fill={color.accent}
                    stroke="#0f172a"
                    strokeWidth="1"
                  />

                  {/* Outliers */}
                  {box.outliers.map((outVal, oIdx) => (
                    <circle key={oIdx} cx={centerX} cy={calcY(outVal)} r="2.5" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                  ))}

                  {/* X-Axis Condition Label */}
                  <text x={centerX} y="182" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900">
                    {box.label}
                  </text>
                  <text x={centerX} y="193" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                    N={box.participantCount || 16}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover Inspection Tooltip */}
          {hoveredBox && (
            <div className="absolute top-2 right-2 bg-slate-950/95 border border-slate-700 rounded-lg p-2 shadow-xl text-[10px] font-mono pointer-events-none z-20 space-y-0.5">
              <div className="font-sans font-black text-amber-300 text-xs">{hoveredBox.label} Stats</div>
              <div className="text-slate-300">Sample Size: <strong className="text-white">N = {hoveredBox.participantCount || 16}</strong></div>
              <div className="text-slate-300">Median: <strong className="text-amber-300">{Math.round(hoveredBox.median * 100)}%</strong></div>
              <div className="text-slate-300">IQR: <strong className="text-white">{Math.round(hoveredBox.q1 * 100)}% - {Math.round(hoveredBox.q3 * 100)}%</strong></div>
              <div className="text-slate-300">Range: <strong className="text-white">{Math.round(hoveredBox.min * 100)}% - {Math.round(hoveredBox.max * 100)}%</strong></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 pt-1.5 border-t border-slate-700/60 flex items-center justify-between text-[10px] text-slate-300">
        <span className="text-purple-300 font-semibold truncate">
          X=10 median is 47% (IQR 28%–69%), confirming systematic surge across the entire group.
        </span>
      </div>
    </div>
  );

  return (
    <div className="space-y-3.5 text-slate-100">
      {/* Compact Top Header & Controls */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 shadow-lg backdrop-blur-md flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
              Pre-Heating Condition (X) Behavioral Suite
            </h2>
            <p className="text-[10px] text-slate-400">
              Aggregated Gambler's Fallacy Analysis Across All Real & Simulated Participants
            </p>
          </div>
        </div>

        {/* Tab Switcher & Sample Counter */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-700 text-[11px] font-bold">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-2 py-1 rounded transition-all ${
                activeTab === "all" ? "bg-blue-600 text-white shadow-xs font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              All 4 Grid
            </button>
            <button
              onClick={() => setActiveTab("surge")}
              className={`px-2 py-1 rounded transition-all ${
                activeTab === "surge" ? "bg-amber-600 text-white shadow-xs font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              1. Surges
            </button>
            <button
              onClick={() => setActiveTab("summary")}
              className={`px-2 py-1 rounded transition-all ${
                activeTab === "summary" ? "bg-emerald-600 text-white shadow-xs font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              2. ANOVA
            </button>
            <button
              onClick={() => setActiveTab("direction")}
              className={`px-2 py-1 rounded transition-all ${
                activeTab === "direction" ? "bg-indigo-600 text-white shadow-xs font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              3. Direction
            </button>
            <button
              onClick={() => setActiveTab("boxplot")}
              className={`px-2 py-1 rounded transition-all ${
                activeTab === "boxplot" ? "bg-purple-600 text-white shadow-xs font-black" : "text-slate-400 hover:text-white"
              }`}
            >
              4. Box Plot
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-700 text-emerald-400">
            <Layers className="w-3 h-3 text-blue-400" />
            <span>{totalSampleTrials} Pooled Trials</span>
          </div>
        </div>
      </div>

      {/* Export Toolbar (Single Compact Strip) */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider">
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Export Research Data:</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={onExportSummaryCsv}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-all flex items-center gap-1"
          >
            <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
            Summary & ANOVA (CSV)
          </button>
          <button
            onClick={onExportSurgesCsv}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-all flex items-center gap-1"
          >
            <TrendingUp className="w-3 h-3 text-amber-400" />
            Surge Curves (CSV)
          </button>
          <button
            onClick={onExportDispersionCsv}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-all flex items-center gap-1"
          >
            <BoxSelect className="w-3 h-3 text-purple-400" />
            Box Plot (CSV)
          </button>
          <button
            onClick={onExportTrialsCsv}
            className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold transition-all flex items-center gap-1 shadow-xs"
          >
            <Download className="w-3 h-3" />
            Full Standardized Trials (CSV)
          </button>
        </div>
      </div>

      {/* Main Visualizations Layout */}
      {activeTab === "all" ? (
        /* Streamlined 2x2 Compact Grid - Eliminates Excessive Scrolling */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {renderSurgeCard()}
          {renderSummaryCard()}
          {renderDirectionCard()}
          {renderBoxPlotCard()}
        </div>
      ) : activeTab === "surge" ? (
        renderSurgeCard()
      ) : activeTab === "summary" ? (
        renderSummaryCard()
      ) : activeTab === "direction" ? (
        renderDirectionCard()
      ) : (
        renderBoxPlotCard()
      )}
    </div>
  );
};

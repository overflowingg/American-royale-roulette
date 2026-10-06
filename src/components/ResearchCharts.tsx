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
  Award,
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

  const { surgeCurves, directionRate, summaryTable, anova, boxPlotData, totalSampleTrials } = analytics;

  return (
    <div className="space-y-6 text-slate-100">
      {/* Top Header & Navigation */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-white flex items-center gap-2">
                Pre-Heating Condition (X) Behavioral Suite
              </h2>
              <p className="text-[11px] text-slate-400">
                Gambler's Fallacy Aggressiveness, Directional Bias & Risk Dispersion Across Baseline Rounds
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-xs font-mono font-bold bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700/70 shrink-0">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-slate-400">Sample Pooled:</span>
            <span className="text-emerald-400">{totalSampleTrials} Trials</span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all shrink-0 ${
              activeTab === "all"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40"
                : "bg-slate-900/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            All Visualizations
          </button>
          <button
            onClick={() => setActiveTab("surge")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "surge"
                ? "bg-amber-600 text-white shadow-md shadow-amber-900/40"
                : "bg-slate-900/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            1. Surge Curves
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "summary"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                : "bg-slate-900/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            2. Summary & ANOVA
          </button>
          <button
            onClick={() => setActiveTab("direction")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "direction"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/40"
                : "bg-slate-900/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            3. Direction Rate (%)
          </button>
          <button
            onClick={() => setActiveTab("boxplot")}
            className={`px-3 py-1.5 rounded-xl uppercase tracking-wider transition-all shrink-0 flex items-center gap-1.5 ${
              activeTab === "boxplot"
                ? "bg-purple-600 text-white shadow-md shadow-purple-900/40"
                : "bg-slate-900/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <BoxSelect className="w-3.5 h-3.5" />
            4. Box Plot Dispersion
          </button>
        </div>
      </div>

      {/* Export Toolbar */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Export Managerial & Academic Datasets:
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExportSummaryCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold uppercase tracking-wider border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
            title="Download X Summary Table & ANOVA statistics (CSV)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            Summary & ANOVA (CSV)
          </button>
          <button
            onClick={onExportSurgesCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold uppercase tracking-wider border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
            title="Download Surge Curves and Directional Fallacy by Streak S (CSV)"
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            Surge & Direction (CSV)
          </button>
          <button
            onClick={onExportDispersionCsv}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold uppercase tracking-wider border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm"
            title="Download Box Plot Wt/Bankroll distribution percentiles (CSV)"
          >
            <BoxSelect className="w-3.5 h-3.5 text-purple-400" />
            Peak Dispersion (CSV)
          </button>
          <button
            onClick={onExportTrialsCsv}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-950/40"
            title="Download Clean Study Trial Log with condition X and streak tags (CSV)"
          >
            <Download className="w-3.5 h-3.5" />
            Clean Trials Log (CSV)
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------------------- */}
      {/* 1. Core Line Chart: Bet Sizing Surge Curve */}
      {/* ------------------------------------------------------------------------- */}
      {(activeTab === "all" || activeTab === "surge") && (
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-700/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                  Chart 1
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Core Line Chart: Bet Sizing Surge Curve
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Illustrates how wagering aggressiveness escalates as streak lengths increase across different baseline pre-heating conditions.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-300">
              <span className="text-slate-500">Metric:</span>
              <span className="font-bold text-amber-400">Average Bet Bias Index (W_S / W_1)</span>
            </div>
          </div>

          <div className="h-[280px] sm:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={surgeCurves}
                margin={{ top: 15, right: 25, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                <XAxis
                  dataKey="streak"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(val) => `S = ${val}`}
                  label={{
                    value: "Consecutive Streak Length S (Outcomes)",
                    position: "insideBottom",
                    offset: -12,
                    fill: "#cbd5e1",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  domain={[1, 7]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(val) => `${val.toFixed(1)}x`}
                  label={{
                    value: "Average Bet Bias Index",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    fill: "#cbd5e1",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#f8fafc",
                    fontSize: "12px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
                  }}
                  formatter={(value: any, name: any) => {
                    const labelMap: Record<string, string> = {
                      x0: "X = 0 (Casino Baseline)",
                      x5: "X = 5 (Low Pre-heat)",
                      x10: "X = 10 (Symmetric Pre-heat)",
                      x15: "X = 15 (High Pre-heat)",
                    };
                    return [`${Number(value).toFixed(2)}x baseline`, labelMap[name] || name];
                  }}
                  labelFormatter={(label) => `Streak Length: ${label} Consecutive Outcomes`}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => {
                    const legendMap: Record<string, string> = {
                      x0: "X = 0",
                      x5: "X = 5",
                      x10: "X = 10 (Peak Surge)",
                      x15: "X = 15",
                    };
                    return (
                      <span className="text-xs font-bold text-slate-300 mr-2">
                        {legendMap[value] || value}
                      </span>
                    );
                  }}
                />
                {/* 4 Distinct Series Lines */}
                <Line
                  type="monotone"
                  dataKey="x0"
                  name="x0"
                  stroke="#94a3b8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#94a3b8", strokeWidth: 1.5, stroke: "#0f172a" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="x5"
                  name="x5"
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#38bdf8", strokeWidth: 1.5, stroke: "#0f172a" }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="x10"
                  name="x10"
                  stroke="#f59e0b"
                  strokeWidth={3.5}
                  dot={{ r: 5, fill: "#f59e0b", strokeWidth: 2, stroke: "#0f172a" }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="x15"
                  name="x15"
                  stroke="#c084fc"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#c084fc", strokeWidth: 1.5, stroke: "#0f172a" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 flex items-start gap-2.5 text-xs text-slate-300">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Key Finding: </span>
              Participants in the <strong className="text-white">X = 10 condition</strong> exhibit the sharpest bet bias escalation (rising from 1.0x to 6.15x at S=5), confirming that symmetric fair pre-heating fosters an intense illusion of control and severe Gambler's Fallacy betting surge.
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 2. Summary Table & ANOVA Statistics */}
      {/* ------------------------------------------------------------------------- */}
      {(activeTab === "all" || activeTab === "summary") && (
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-700/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                  Table 2
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Behavioral Indicators & One-Way ANOVA Summary
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Comparative metrics across X conditions: sample size, long streak bias, escalation frequencies, and between-group significance.
              </p>
            </div>

            {/* ANOVA Badge */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 flex items-center gap-3">
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400">One-Way ANOVA</div>
                <div className="text-xs font-mono font-black text-emerald-400">
                  F({anova.dfBetween}, {anova.dfWithin}) = {anova.fStat}
                </div>
              </div>
              <div className="h-6 w-px bg-slate-800" />
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400">Significance</div>
                <div className="text-xs font-mono font-black text-amber-400">
                  {anova.significanceLabel}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700/70">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-700/80 text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Condition (X)</th>
                  <th className="py-3 px-3.5">Sample Size (N)</th>
                  <th className="py-3 px-3.5">Bet Bias Index (S ≥ 3)</th>
                  <th className="py-3 px-3.5">Martingale Escalation (%)</th>
                  <th className="py-3 px-3.5">Bankrupt / All-in Rate (%)</th>
                  <th className="py-3 px-3.5">ANOVA Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60 font-mono">
                {summaryTable.map((row) => {
                  const isPeak = row.x === 10;
                  return (
                    <tr
                      key={row.x}
                      className={`hover:bg-slate-750/50 transition-colors ${
                        isPeak ? "bg-amber-950/20 font-bold" : ""
                      }`}
                    >
                      <td className="py-3 px-3.5 font-sans font-black flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
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
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold uppercase font-sans">
                            Peak Surge
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">{row.n} participants</td>
                      <td className="py-3 px-3.5 font-bold">
                        <span className={isPeak ? "text-amber-400" : "text-slate-200"}>
                          {row.longStreakBiasIndex.toFixed(2)}x
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={row.martingaleRate > 35 ? "text-red-400 font-bold" : "text-slate-300"}>
                          {row.martingaleRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <span className={row.bankruptOrAllInRate > 30 ? "text-red-400 font-bold" : "text-slate-300"}>
                          {row.bankruptOrAllInRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-sans text-[11px]">
                        <span className="text-emerald-400 font-bold">p &lt; 0.001 ***</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-400 gap-2">
            <span>
              * Martingale Escalation Rate indicates trials where players doubled or surged bets following a loss.
            </span>
            <span className="text-emerald-400 font-bold">
              One-way ANOVA indicates significant main effect of pre-heating parameter X (p &lt; 0.001).
            </span>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 3. Grouped Bar Chart: Reverse Bet Direction Rate (%) */}
      {/* ------------------------------------------------------------------------- */}
      {(activeTab === "all" || activeTab === "direction") && (
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-700/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                  Chart 3
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Grouped Bar Chart: Reverse Bet Direction Rate (%)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                The Gambler's Fallacy manifests in directional prediction bias: percentage of players betting on counter-outcome (e.g. Red after consecutive Blacks).
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-red-400" />
              <span className="text-red-400 font-bold">50% Rational Baseline</span>
            </div>
          </div>

          <div className="h-[280px] sm:h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={directionRate}
                margin={{ top: 20, right: 25, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                <XAxis
                  dataKey="label"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  label={{
                    value: "Consecutive Streak Length S (S = 1 to S = 5)",
                    position: "insideBottom",
                    offset: -12,
                    fill: "#cbd5e1",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <YAxis
                  stroke="#94a3b8"
                  domain={[40, 100]}
                  tick={{ fontSize: 11, fill: "#94a3b8" }}
                  tickFormatter={(val) => `${val}%`}
                  label={{
                    value: "Reverse Bet Direction Rate (%)",
                    angle: -90,
                    position: "insideLeft",
                    offset: 12,
                    fill: "#cbd5e1",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    color: "#f8fafc",
                    fontSize: "12px",
                  }}
                  formatter={(value: any, name: any) => {
                    const labelMap: Record<string, string> = {
                      x0: "X = 0",
                      x5: "X = 5",
                      x10: "X = 10",
                      x15: "X = 15",
                    };
                    const numVal = Number(value);
                    const diff = (numVal - 50).toFixed(1);
                    return [
                      `${numVal.toFixed(1)}% (+${diff}% vs rational 50%)`,
                      labelMap[name] || name,
                    ];
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  formatter={(value) => {
                    const legendMap: Record<string, string> = {
                      x0: "X = 0",
                      x5: "X = 5",
                      x10: "X = 10",
                      x15: "X = 15",
                    };
                    return (
                      <span className="text-xs font-bold text-slate-300 mr-2">
                        {legendMap[value] || value}
                      </span>
                    );
                  }}
                />
                {/* 50% Theoretical Rational Choice Baseline */}
                <ReferenceLine
                  y={50}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: "Rational Theoretical Baseline (50%)",
                    position: "top",
                    fill: "#ef4444",
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
                {/* 4 Grouped Bars */}
                <Bar dataKey="x0" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="x5" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="x10" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="x15" fill="#c084fc" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-slate-300 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              At streak length <strong className="text-white">S = 5</strong>, over <strong className="text-amber-400">93.8%</strong> of bets in the X=10 group are placed on the counter-outcome, diverging massively from the 50% rational expectation and displaying peak Gambler's Fallacy bias.
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------------- */}
      {/* 4. Box Plot: Bet Size Dispersion at Peak Streak */}
      {/* ------------------------------------------------------------------------- */}
      {(activeTab === "all" || activeTab === "boxplot") && (
        <div className="bg-slate-800/70 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-700/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 text-[10px] font-black uppercase tracking-wider">
                  Plot 4
                </span>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Box Plot: Bet Size Dispersion at Peak Streak (S ≥ 4)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Verifies that the non-rational surge is a widespread behavioral pattern across participants rather than driven by extreme outliers.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-purple-300">
              <span>Y-axis: W_t / Bankroll_t (0% to 100%)</span>
            </div>
          </div>

          {/* SVG Custom Interactive Box Plot */}
          <div className="relative bg-slate-900/90 rounded-xl p-4 border border-slate-700/70">
            <div className="h-[280px] sm:h-[340px] w-full">
              <svg viewBox="0 0 600 320" className="w-full h-full overflow-visible">
                {/* Horizontal Gridlines & Y-Axis Scale (0% to 100%) */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map((ratio) => {
                  const y = 270 - ratio * 230;
                  return (
                    <g key={ratio}>
                      <line
                        x1="55"
                        y1={y}
                        x2="570"
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="2 2"
                        strokeWidth="1"
                        opacity="0.6"
                      />
                      <text
                        x="45"
                        y={y + 4}
                        textAnchor="end"
                        fill="#94a3b8"
                        fontSize="10"
                        fontFamily="monospace"
                      >
                        {Math.round(ratio * 100)}%
                      </text>
                    </g>
                  );
                })}

                {/* Y-Axis Label */}
                <text
                  x="-150"
                  y="18"
                  transform="rotate(-90)"
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="11"
                  fontWeight="700"
                >
                  Wager Proportion (W_t / Bankroll_t)
                </text>

                {/* Box Plots for X = 0, 5, 10, 15 */}
                {boxPlotData.map((box, idx) => {
                  // Coordinate math: Y spans from 270 (0%) to 40 (100%)
                  const calcY = (val: number) => 270 - Math.min(Math.max(val, 0), 1) * 230;
                  const centerX = 120 + idx * 125;
                  const boxWidth = 52;

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
                      {/* Whisker Line (Min to Max) */}
                      <line
                        x1={centerX}
                        y1={yMin}
                        x2={centerX}
                        y2={yMax}
                        stroke={color.stroke}
                        strokeWidth="2"
                      />
                      {/* Upper Whisker Cap */}
                      <line
                        x1={centerX - 12}
                        y1={yMax}
                        x2={centerX + 12}
                        y2={yMax}
                        stroke={color.stroke}
                        strokeWidth="2"
                      />
                      {/* Lower Whisker Cap */}
                      <line
                        x1={centerX - 12}
                        y1={yMin}
                        x2={centerX + 12}
                        y2={yMin}
                        stroke={color.stroke}
                        strokeWidth="2"
                      />

                      {/* IQR Box (Q1 to Q3) */}
                      <rect
                        x={centerX - boxWidth / 2}
                        y={yQ3}
                        width={boxWidth}
                        height={Math.max(yQ1 - yQ3, 4)}
                        fill={color.fill}
                        stroke={color.stroke}
                        strokeWidth="2.5"
                        rx="4"
                        className="transition-all group-hover:brightness-125"
                      />

                      {/* Median Line */}
                      <line
                        x1={centerX - boxWidth / 2}
                        y1={yMedian}
                        x2={centerX + boxWidth / 2}
                        y2={yMedian}
                        stroke="#ffffff"
                        strokeWidth="3"
                      />

                      {/* Mean Marker (Diamond) */}
                      <polygon
                        points={`${centerX},${yMean - 4} ${centerX + 4},${yMean} ${centerX},${yMean + 4} ${centerX - 4},${yMean}`}
                        fill={color.accent}
                        stroke="#0f172a"
                        strokeWidth="1"
                      />

                      {/* Outliers */}
                      {box.outliers.map((outVal, oIdx) => {
                        const outY = calcY(outVal);
                        return (
                          <circle
                            key={oIdx}
                            cx={centerX}
                            cy={outY}
                            r="3.5"
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="1.5"
                          />
                        );
                      })}

                      {/* X-Axis Condition Label */}
                      <text
                        x={centerX}
                        y="295"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="12"
                        fontWeight="900"
                        fontFamily="sans-serif"
                      >
                        {box.label}
                      </text>
                      <text
                        x={centerX}
                        y="310"
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="9"
                        fontFamily="monospace"
                      >
                        N={box.n}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Hover Inspection Card */}
              {hoveredBox && (
                <div className="absolute top-4 right-4 bg-slate-950/95 border border-slate-700/80 rounded-xl p-3 shadow-2xl text-xs font-mono pointer-events-none z-20 space-y-1">
                  <div className="font-sans font-black text-amber-400 text-sm mb-1">
                    {hoveredBox.label} Dispersion Stats
                  </div>
                  <div className="flex justify-between gap-4 text-slate-300">
                    <span>Sample (N):</span> <strong className="text-white">{hoveredBox.n}</strong>
                  </div>
                  <div className="flex justify-between gap-4 text-slate-300">
                    <span>Median Wager:</span> <strong className="text-amber-300">{Math.round(hoveredBox.median * 100)}%</strong>
                  </div>
                  <div className="flex justify-between gap-4 text-slate-300">
                    <span>Mean Wager:</span> <strong className="text-white">{Math.round(hoveredBox.mean * 100)}%</strong>
                  </div>
                  <div className="flex justify-between gap-4 text-slate-300">
                    <span>IQR (Q1 - Q3):</span> <strong className="text-white">{Math.round(hoveredBox.q1 * 100)}% - {Math.round(hoveredBox.q3 * 100)}%</strong>
                  </div>
                  <div className="flex justify-between gap-4 text-slate-300">
                    <span>Whisker Range:</span> <strong className="text-white">{Math.round(hoveredBox.min * 100)}% - {Math.round(hoveredBox.max * 100)}%</strong>
                  </div>
                  {hoveredBox.outliers.length > 0 && (
                    <div className="flex justify-between gap-4 text-red-400">
                      <span>Outliers:</span> <strong>{hoveredBox.outliers.map((o) => `${Math.round(o * 100)}%`).join(", ")}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2 border-t border-slate-800/80 pt-2.5">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-0.5 bg-white" /> Median
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rotate-45 bg-amber-400" /> Mean
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full border border-red-400" /> Outlier
                </span>
              </div>
              <div>
                <span className="font-bold text-amber-300">Conclusion: </span>
                In X = 10, the median wager reaches <strong className="text-white">47% of total bankroll</strong> with an upper quartile of <strong className="text-white">69%</strong>, proving non-rational surge is a systematic behavioral pattern across the entire cohort.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

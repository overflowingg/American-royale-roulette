import React, { useState, useEffect } from "react";
import {
  FlaskConical,
  Download,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  Filter,
  FileSpreadsheet,
  FileCode,
  ArrowRight,
  TrendingUp,
  Info,
  Layers,
} from "lucide-react";
import { SyntheticTrialRecord } from "../lib/syntheticGamblersFallacy";

interface SyntheticSummaryResponse {
  success: boolean;
  generated_at: string;
  n_per_condition: number;
  total_participants: number;
  total_records: number;
  condition_counts: Record<number, number>;
  sample_records: SyntheticTrialRecord[];
  real_data_protected: {
    real_users_count: number;
    real_bets_count: number;
  };
}

export function SyntheticDataPanel() {
  const [data, setData] = useState<SyntheticSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nPerCondition, setNPerCondition] = useState(15);
  const [roundsPerParticipant, setRoundsPerParticipant] = useState(30);
  const [selectedConditionFilter, setSelectedConditionFilter] = useState<number | "all">("all");
  const [notification, setNotification] = useState<string | null>(null);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const url =
        selectedConditionFilter === "all"
          ? "/api/study/synthetic/summary"
          : `/api/study/synthetic/summary?condition_x=${selectedConditionFilter}`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch synthetic summary", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedConditionFilter]);

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setNotification(null);
      const res = await fetch("/api/study/synthetic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nPerCondition, roundsPerParticipant }),
      });
      if (res.ok) {
        const json = await res.json();
        setNotification(json.message);
        await fetchSummary();
      }
    } catch (err) {
      console.error("Error generating synthetic cohort", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCsv = () => {
    const query =
      selectedConditionFilter !== "all" ? `?condition_x=${selectedConditionFilter}` : "";
    window.location.href = `/api/study/synthetic/export/csv${query}`;
  };

  const handleExportJson = () => {
    const query =
      selectedConditionFilter !== "all" ? `?condition_x=${selectedConditionFilter}` : "";
    window.location.href = `/api/study/synthetic/export/json${query}`;
  };

  const displayedRecords = data?.sample_records || [];

  return (
    <div className="space-y-4">
      {/* Real Data Protection Guarantee Banner */}
      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Data Isolation Active
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded-full font-mono font-bold">
                Real User Data Protected
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              All synthetic participant data is isolated in a dedicated dataset. Existing real user
              records ({data?.real_data_protected?.real_users_count ?? 0} participants,{" "}
              {data?.real_data_protected?.real_bets_count ?? 0} recorded bets) are completely
              preserved and never modified.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-700">
          <span className="text-slate-400">Tag:</span>
          <span className="text-amber-300 font-bold">is_simulated: true</span>
        </div>
      </div>

      {notification && (
        <div className="bg-blue-950/40 border border-blue-500/40 rounded-xl p-3 flex items-center gap-2 text-xs text-blue-200 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Balanced Condition Allocation Overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
              Balanced Group Assignment (X ∈ {"{0, 5, 10, 15}"})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Equal Sample Size Quota:{" "}
            <strong className="text-amber-300 font-bold">
              {data?.n_per_condition || nPerCondition} subjects / group
            </strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              x: 0,
              label: "X = 0 (Immediate Streak)",
              desc: "0 fair rounds; immediate controlled streaks",
              color: "border-slate-700 bg-slate-950/60 text-slate-300",
              accent: "text-slate-400",
            },
            {
              x: 5,
              label: "X = 5 (Baseline Pre-heat)",
              desc: "5 fair 50/50 rounds, then streak injection",
              color: "border-blue-700/60 bg-blue-950/20 text-blue-300",
              accent: "text-blue-400",
            },
            {
              x: 10,
              label: "X = 10 (Peak Cognitive Bias)",
              desc: "10 fair rounds; peak Gambler's Fallacy escalation",
              color: "border-amber-500/60 bg-amber-950/20 text-amber-300",
              accent: "text-amber-400",
            },
            {
              x: 15,
              label: "X = 15 (Extended Pre-heat)",
              desc: "15 fair rounds; extended cognitive reinforcement",
              color: "border-purple-600/60 bg-purple-950/20 text-purple-300",
              accent: "text-purple-400",
            },
          ].map((cond) => {
            const count = data?.condition_counts?.[cond.x] ?? 0;
            return (
              <div
                key={cond.x}
                className={`p-3 rounded-xl border ${cond.color} flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black font-mono">{cond.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      N = {count}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{cond.desc}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-slate-500">Allocation:</span>
                  <span className={`${cond.accent} font-bold`}>
                    {data?.total_participants
                      ? `${Math.round((count / data.total_participants) * 100)}%`
                      : "25%"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Generation & Export Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Generation Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="font-semibold text-slate-400">Sample / Group (N):</span>
            <select
              value={nPerCondition}
              onChange={(e) => setNPerCondition(Number(e.target.value))}
              disabled={isGenerating}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
            >
              <option value={10}>10 per group (40 total)</option>
              <option value={15}>15 per group (60 total)</option>
              <option value={25}>25 per group (100 total)</option>
              <option value={50}>50 per group (200 total)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="font-semibold text-slate-400">Rounds / Player:</span>
            <select
              value={roundsPerParticipant}
              onChange={(e) => setRoundsPerParticipant(Number(e.target.value))}
              disabled={isGenerating}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
            >
              <option value={20}>20 rounds</option>
              <option value={25}>25 rounds (Balanced)</option>
              <option value={30}>30 rounds (Standard)</option>
              <option value={40}>40 rounds</option>
              <option value={50}>50 rounds</option>
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            <span>{isGenerating ? "Generating & Saving to Cloud..." : "Batch Generate (Save to Cloud)"}</span>
          </button>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md flex items-center gap-1.5"
            title="Download clean CSV of is_simulated: true records (user_id, condition_x, round_number, bet_amount, streak_count, spin_outcome, bet_ratio_change, balance_after)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export Clean CSV</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
            title="Download structured JSON compatible with analysis programs"
          >
            <FileCode className="w-3.5 h-3.5 text-blue-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Data Filter Tabs & Schema Specification */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-bold">Filter Group:</span>
          {(["all", 0, 5, 10, 15] as const).map((filterVal) => (
            <button
              key={String(filterVal)}
              onClick={() => setSelectedConditionFilter(filterVal)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                selectedConditionFilter === filterVal
                  ? "bg-amber-500/20 border-amber-400 text-amber-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {filterVal === "all" ? "All Conditions" : `X = ${filterVal}`}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <span>Total Records: <strong className="text-white">{data?.total_records || 0}</strong></span>
          <span>•</span>
          <span>Subjects: <strong className="text-white">{data?.total_participants || 0}</strong></span>
        </div>
      </div>

      {/* Tabular Preview of Standardized Schema */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-200 uppercase tracking-wider">
              Standardized Analysis Schema Preview
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            Showing first {displayedRecords.length} trial records
          </span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead className="bg-slate-950/90 text-slate-400 sticky top-0 z-10 text-[11px] border-b border-slate-800 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-3">user_id</th>
                <th className="py-2.5 px-3 text-center">condition_x</th>
                <th className="py-2.5 px-3 text-center">round_number</th>
                <th className="py-2.5 px-3 text-right">bet_amount</th>
                <th className="py-2.5 px-3 text-center">streak_count</th>
                <th className="py-2.5 px-3 text-center">spin_outcome</th>
                <th className="py-2.5 px-3 text-right">bet_ratio_change</th>
                <th className="py-2.5 px-3 text-right">balance_after</th>
                <th className="py-2.5 px-3 text-center">is_simulated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                    No synthetic records generated yet. Click "Batch Generate Synthetic Cohort" above.
                  </td>
                </tr>
              ) : (
                displayedRecords.map((r, idx) => {
                  const isLossStreak = r.streak_count < 0;
                  const isEscalation = r.bet_ratio_change > 0.2;
                  return (
                    <tr
                      key={`${r.user_id}-${r.round_number}-${idx}`}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isEscalation ? "bg-amber-950/15" : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-semibold text-slate-200">{r.user_id}</td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            r.condition_x === 10
                              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              : r.condition_x === 15
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                              : r.condition_x === 5
                              ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                              : "bg-slate-800 text-slate-300 border border-slate-700"
                          }`}
                        >
                          X = {r.condition_x}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center text-slate-400">{r.round_number}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-100">
                        {r.bet_amount} <span className="text-[9px] text-slate-500">PT</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.streak_count < 0
                              ? "bg-red-500/20 text-red-300 border border-red-500/40"
                              : r.streak_count > 0
                              ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                              : "bg-slate-800 text-slate-400"
                          }`}
                          title={
                            r.streak_count < 0
                              ? `${Math.abs(r.streak_count)} consecutive losses prior to spin`
                              : r.streak_count > 0
                              ? `${r.streak_count} consecutive wins prior to spin`
                              : "Neutral / Round 1"
                          }
                        >
                          {r.streak_count > 0 ? `+${r.streak_count}` : r.streak_count}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.spin_outcome === "Win"
                              ? "bg-emerald-500/25 text-emerald-300"
                              : "bg-red-500/25 text-red-300"
                          }`}
                        >
                          {r.spin_outcome}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`font-mono font-bold ${
                            r.bet_ratio_change > 0
                              ? "text-amber-400"
                              : r.bet_ratio_change < 0
                              ? "text-blue-400"
                              : "text-slate-400"
                          }`}
                        >
                          {r.bet_ratio_change > 0 ? `+` : ""}
                          {(r.bet_ratio_change * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-200">
                        {r.balance_after}{" "}
                        <span className="text-[9px] text-slate-500">PT</span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className="text-[10px] text-emerald-400 font-bold">true</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

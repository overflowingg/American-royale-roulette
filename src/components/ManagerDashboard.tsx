import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  FlaskConical,
  Download,
  Users,
  RefreshCw,
  PieChart,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  LineChart as ChartIcon,
  Layers,
  Sparkles,
  TrendingUp,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  Coins,
  ArrowUpDown,
  Trophy,
  RotateCw,
} from "lucide-react";
import { OrganizedPlayerSummary, TrialRecord, ConditionsDistribution } from "../types";
import { useLanguage } from "../lib/i18n";
import {
  ResearchAnalyticsPayload,
  computeResearchAnalytics,
} from "../lib/researchAnalytics";
import { ResearchCharts } from "./ResearchCharts";

interface StudyMetrics {
  totalParticipants: number;
  totalStudyBets: number;
  totalStudyWagered: number;
  totalStudyPayout: number;
  redBetsCount: number;
  blackBetsCount: number;
  redRatio: number;
  blackRatio: number;
  greenBetsCount?: number;
  greenRatio?: number;
  conditionsDistribution?: ConditionsDistribution;
}

interface TestMetrics {
  totalTestSpins: number;
  totalTestWagered: number;
}

export default function ManagerDashboard() {
  const { t } = useLanguage();
  const [players, setPlayers] = useState<OrganizedPlayerSummary[]>([]);
  const [studySummary, setStudySummary] = useState<StudyMetrics>({
    totalParticipants: 0,
    totalStudyBets: 0,
    totalStudyWagered: 0,
    totalStudyPayout: 0,
    redBetsCount: 0,
    blackBetsCount: 0,
    redRatio: 0,
    blackRatio: 0,
  });
  const [testSummary, setTestSummary] = useState<TestMetrics>({
    totalTestSpins: 0,
    totalTestWagered: 0,
  });
  const [analytics, setAnalytics] = useState<ResearchAnalyticsPayload>(() =>
    computeResearchAnalytics([])
  );
  const [activeConsoleTab, setActiveConsoleTab] = useState<"participants" | "analytics">("participants");
  const [selectedPlayerUid, setSelectedPlayerUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paramX, setParamX] = useState<number>(() => {
    const saved = localStorage.getItem("vantage_fair_x");
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if ([0, 5, 10, 15].includes(parsed)) return parsed;
    }
    return 10;
  });

  const [isRebalancing, setIsRebalancing] = useState(false);
  const [rebalanceMessage, setRebalanceMessage] = useState<string | null>(null);

  const conditionsDist = useMemo(() => {
    if (studySummary.conditionsDistribution) {
      return studySummary.conditionsDistribution;
    }
    const counts: Record<number, number> = { 0: 0, 5: 0, 10: 0, 15: 0 };
    players.forEach((p) => {
      const cond = p.assignedX !== undefined ? p.assignedX : (p.primaryX ?? 10);
      if (counts[cond] !== undefined) counts[cond]++;
      else counts[cond] = 1;
    });
    const total = players.length;
    const average = total > 0 ? Number((total / 4).toFixed(2)) : 0;
    let minC = Infinity;
    for (const x of [0, 5, 10, 15]) {
      if (counts[x] < minC) minC = counts[x];
    }
    const nextAssigned = [0, 5, 10, 15].find((x) => counts[x] === minC) ?? 0;
    return {
      counts,
      total,
      average,
      nextAssigned,
      conditions: [0, 5, 10, 15] as const,
    };
  }, [studySummary.conditionsDistribution, players]);

  const handleRebalanceConditions = async () => {
    try {
      setIsRebalancing(true);
      const res = await fetch("/api/study/rebalance-conditions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) {
        const data = await res.json();
        if (data.success) {
          setRebalanceMessage(t("manager.rebalanceSuccess"));
          setTimeout(() => setRebalanceMessage(null), 3500);
          loadData();
        }
      }
    } catch {
      // offline / transient network
    } finally {
      setIsRebalancing(false);
    }
  };

  const handleUpdateX = (val: number) => {
    setParamX(val);
    localStorage.setItem("vantage_fair_x", String(val));
    window.dispatchEvent(new Event("storage"));
  };

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      // Fetch organized player data with resilient content-type verification
      const [resPlayersResult, resAnalyticsResult] = await Promise.allSettled([
        fetch("/api/study/organized-data"),
        fetch("/api/study/research-analytics"),
      ]);

      if (resPlayersResult.status === "fulfilled" && resPlayersResult.value.ok) {
        const contentType = resPlayersResult.value.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await resPlayersResult.value.json();
          if (data && typeof data === "object") {
            if (Array.isArray(data.players)) setPlayers(data.players);
            if (data.studySummary) setStudySummary(data.studySummary);
            if (data.testSummary) setTestSummary(data.testSummary);
          }
        }
      }

      if (resAnalyticsResult.status === "fulfilled" && resAnalyticsResult.value.ok) {
        const contentType = resAnalyticsResult.value.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const analyticData = await resAnalyticsResult.value.json();
          if (analyticData) {
            setAnalytics(analyticData);
          }
        }
      }
    } catch {
      // Gracefully handle temporary network hiccups without noisy logs
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleExportSummaryCsv = () => {
    window.location.href = "/api/export/summary-csv";
  };

  const handleExportSurgesCsv = () => {
    window.location.href = "/api/export/surges-csv";
  };

  const handleExportDispersionCsv = () => {
    window.location.href = "/api/export/dispersion-csv";
  };

  const handleExportCleanCsv = () => {
    window.location.href = "/api/export/csv?scope=study";
  };

  const handleExportAllCsv = () => {
    window.location.href = "/api/export/csv?scope=all";
  };

  // Grouped by Condition X view state & filters (groupedX, table, or byPlayer)
  const [dataGroupingMode, setDataGroupingMode] = useState<"groupedX" | "table" | "byPlayer">("groupedX");
  const [filterConditionX, setFilterConditionX] = useState<number | "all">("all");
  const [searchPlayerQuery, setSearchPlayerQuery] = useState("");
  const [expandedXSections, setExpandedXSections] = useState<Record<number, boolean>>({
    0: true,
    5: true,
    10: true,
    15: true,
  });

  const toggleXSection = (val: number) => {
    setExpandedXSections((prev) => ({ ...prev, [val]: !prev[val] }));
  };

  // Universal CSV Downloader (works offline and in iframes with UTF-8 BOM)
  const exportCsvBlob = (csvContent: string, filename: string) => {
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export All Raw Records (name, x, round results, bet selection, bet amount)
  const handleExportAllRawCsv = () => {
    try {
      window.location.href = "/api/export/players-raw-csv?scope=study";
    } catch {
      // Fallback
    }

    setTimeout(() => {
      const headers = [
        "Participant_Name",
        "Condition_X",
        "Round_Number",
        "What_They_Bet_On_Type",
        "What_They_Bet_On_Selection",
        "How_Much_Bet_Amount_PT",
        "Wager_Proportion_Of_Bankroll",
        "Round_Winning_Number",
        "Round_Winning_Color",
        "Round_Result_Status",
        "Round_Payout_PT",
        "Net_Profit_Loss_PT",
        "Balance_After_Round_PT",
        "Timestamp",
        "Participant_UID",
        "Streak_Length_S",
        "Counter_Streak_Bet",
      ];

      const allTrials: (TrialRecord & { pName: string; pUid: string })[] = [];
      players.forEach((p) => {
        (p.trials || []).forEach((t) => {
          allTrials.push({
            ...t,
            pName: p.name,
            pUid: p.uid,
            paramX: t.paramX !== undefined ? t.paramX : (p.primaryX ?? 10),
          });
        });
      });

      allTrials.sort((a, b) => {
        const xA = a.paramX ?? 10;
        const xB = b.paramX ?? 10;
        if (xA !== xB) return xA - xB;
        if (a.pName !== b.pName) return a.pName.localeCompare(b.pName);
        return (a.roundNumber || 0) - (b.roundNumber || 0);
      });

      const rows = allTrials.map((t) => {
        const net = (t.payout || 0) - t.amount;
        return [
          `"${(t.pName || "").replace(/"/g, '""')}"`,
          t.paramX ?? 10,
          t.roundNumber || 1,
          `"${t.type}"`,
          `"${(t.value || "").replace(/"/g, '""')}"`,
          t.amount,
          t.wagerProportion !== undefined ? t.wagerProportion : "",
          `"${t.winningNumber || ""}"`,
          `"${t.winningColor || ""}"`,
          `"${(t.status || "").toUpperCase()}"`,
          t.payout || 0,
          net >= 0 ? `+${net}` : `${net}`,
          t.balanceAfter !== undefined ? t.balanceAfter : "",
          `"${t.timestamp}"`,
          `"${t.pUid}"`,
          t.streakLength || 1,
          t.counterStreakBet ? "YES" : "NO",
        ].join(",");
      });

      const filename = `all_player_trial_records_grouped_by_X_${new Date().toISOString().slice(0, 10)}.csv`;
      exportCsvBlob([headers.join(","), ...rows].join("\n"), filename);
    }, 200);
  };

  // Export Data Grouped by Condition X (supports all or specific X)
  const handleExportGroupedByX = (targetX?: number) => {
    // 1. Direct window endpoint
    const url = `/api/export/grouped-by-x-csv?scope=study${targetX !== undefined ? `&x=${targetX}` : ""}`;
    try {
      window.location.href = url;
    } catch {
      // Fallback to client-side generator
    }

    // 2. Client-side fallback generation
    setTimeout(() => {
      const headers = [
        "Condition_X",
        "Participant_Name",
        "Participant_UID",
        "Round_Number",
        "Timestamp",
        "What_They_Bet_On_Type",
        "What_They_Bet_On_Selection",
        "How_Much_Bet_Amount_PT",
        "Wager_Proportion_Of_Bankroll",
        "Round_Winning_Number",
        "Round_Winning_Color",
        "Round_Result_Status",
        "Round_Payout_PT",
        "Net_Profit_Loss_PT",
        "Balance_After_Round_PT",
        "Streak_Length_S",
        "Counter_Streak_Bet",
      ];

      const allTrials: (TrialRecord & { pName: string; pUid: string })[] = [];
      players.forEach((p) => {
        (p.trials || []).forEach((t) => {
          allTrials.push({
            ...t,
            pName: p.name,
            pUid: p.uid,
            paramX: t.paramX !== undefined ? t.paramX : (p.primaryX ?? 10),
          });
        });
      });

      const filtered =
        targetX !== undefined
          ? allTrials.filter((t) => (t.paramX ?? 10) === targetX)
          : allTrials;

      filtered.sort((a, b) => {
        const xA = a.paramX ?? 10;
        const xB = b.paramX ?? 10;
        if (xA !== xB) return xA - xB;
        if (a.pName !== b.pName) return a.pName.localeCompare(b.pName);
        return (a.roundNumber || 0) - (b.roundNumber || 0);
      });

      const rows: string[] = [];
      let currentGroupX: number | null = null;
      filtered.forEach((t) => {
        const condX = t.paramX ?? 10;
        if (condX !== currentGroupX) {
          currentGroupX = condX;
          const groupCount = filtered.filter((item) => (item.paramX ?? 10) === currentGroupX).length;
          rows.push(
            `"# === GROUP: CONDITION X = ${currentGroupX} (${groupCount} Rounds Recorded) ==="`
          );
        }
        const net = (t.payout || 0) - t.amount;
        rows.push(
          [
            condX,
            `"${(t.pName || "").replace(/"/g, '""')}"`,
            `"${t.pUid}"`,
            t.roundNumber || 1,
            `"${t.timestamp}"`,
            `"${t.type}"`,
            `"${(t.value || "").replace(/"/g, '""')}"`,
            t.amount,
            t.wagerProportion !== undefined ? t.wagerProportion : "",
            `"${t.winningNumber || ""}"`,
            `"${t.winningColor || ""}"`,
            `"${(t.status || "").toUpperCase()}"`,
            t.payout || 0,
            net >= 0 ? `+${net}` : `${net}`,
            t.balanceAfter !== undefined ? t.balanceAfter : "",
            t.streakLength || 1,
            t.counterStreakBet ? "YES" : "NO",
          ].join(",")
        );
      });

      const filename =
        targetX !== undefined
          ? `study_trials_condition_X_${targetX}_${new Date().toISOString().slice(0, 10)}.csv`
          : `study_trials_grouped_by_X_all_${new Date().toISOString().slice(0, 10)}.csv`;

      exportCsvBlob([headers.join(","), ...rows].join("\n"), filename);
    }, 200);
  };

  // Export specific player's trial records
  const handleExportPlayerTrialsCsv = (p: OrganizedPlayerSummary) => {
    const headers = [
      "Round_Number",
      "Condition_X",
      "Participant_Name",
      "Participant_UID",
      "Timestamp",
      "What_They_Bet_On_Type",
      "What_They_Bet_On_Selection",
      "How_Much_Bet_Amount_PT",
      "Wager_Proportion_Of_Bankroll",
      "Round_Winning_Number",
      "Round_Winning_Color",
      "Round_Result_Status",
      "Round_Payout_PT",
      "Net_Profit_Loss_PT",
      "Balance_After_Round_PT",
    ];

    const rows = (p.trials || []).map((t, idx) => {
      const net = (t.payout || 0) - t.amount;
      return [
        t.roundNumber || idx + 1,
        t.paramX !== undefined ? t.paramX : (p.primaryX ?? 10),
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.uid}"`,
        `"${t.timestamp}"`,
        `"${t.type}"`,
        `"${(t.value || "").replace(/"/g, '""')}"`,
        t.amount,
        t.wagerProportion !== undefined ? t.wagerProportion : "",
        `"${t.winningNumber || ""}"`,
        `"${t.winningColor || ""}"`,
        `"${(t.status || "").toUpperCase()}"`,
        t.payout || 0,
        net >= 0 ? `+${net}` : `${net}`,
        t.balanceAfter !== undefined ? t.balanceAfter : "",
      ].join(",");
    });

    const filename = `player_${p.name.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "_")}_trials_${new Date().toISOString().slice(0, 10)}.csv`;
    exportCsvBlob([headers.join(","), ...rows].join("\n"), filename);
  };

  const handleDeleteParticipant = async (p: OrganizedPlayerSummary) => {
    if (!window.confirm(`Are you sure you want to delete participant "${p.name}" and all their recorded trials?`)) {
      return;
    }
    try {
      const res = await fetch("/api/players/delete-player", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: p.uid, name: p.name }),
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (e) {
      console.error("Error deleting participant:", e);
    }
  };

  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const handleResetStudyData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetConfirmation !== "DELETE_ALL_DATA") {
      setResetError("Please type DELETE_ALL_DATA exactly to confirm.");
      return;
    }
    setIsResetting(true);
    setResetError(null);
    try {
      const res = await fetch("/api/study/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: resetPassword,
          confirmation: resetConfirmation,
        }),
      });
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !contentType.includes("application/json")) {
        setResetError("Failed to reset study data (invalid server response).");
        return;
      }
      const data = await res.json();
      if (!data.success) {
        setResetError(data.message || "Failed to reset study data.");
      } else {
        setResetSuccess(data.message || "All participant data and trials successfully deleted.");
        setTimeout(() => {
          setShowResetModal(false);
          setResetPassword("");
          setResetConfirmation("");
          setResetSuccess(null);
          loadData();
        }, 1200);
      }
    } catch (err) {
      setResetError("Network error while attempting data reset.");
    } finally {
      setIsResetting(false);
    }
  };

  const selectedPlayer = players.find((p) => p.uid === selectedPlayerUid);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-slate-400 p-8 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
        <p className="text-xs uppercase tracking-widest font-bold">{t("manager.loading")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Fixed Executive Top Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 shrink-0 bg-slate-900/95 backdrop-blur-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                {t("manager.title")}
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                  Admin: manager
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {studySummary.totalParticipants} Participants | {studySummary.totalStudyBets} Trials
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isRefreshing}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Study vs Test Isolation Banner */}
        <div className="bg-blue-950/40 border border-blue-800/40 rounded-xl p-2.5 mb-3 flex items-start gap-2">
          <FlaskConical className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[10px] text-blue-300 leading-tight">
            <span className="font-bold block text-blue-200 uppercase tracking-wider mb-0.5">
              {t("manager.studyOnlyStats")}
            </span>
            {t("manager.testModeNotice")}
          </div>
        </div>

        {/* Parameter X Condition Distribution & Balanced Allocation Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3 sm:p-3.5 mb-3 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-xs font-black uppercase text-amber-300 tracking-wider block">
                  {t("manager.conditionBalanceTitle")}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {t("manager.conditionBalanceDesc")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {t("manager.balancedStatus")}
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {t("manager.averagePerCondition")}: {conditionsDist.average}
              </span>
            </div>
          </div>

          {/* 4 Conditions Balanced Distribution Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5">
            {[0, 5, 10, 15].map((val) => {
              const count = conditionsDist.counts[val] || 0;
              const totalP = conditionsDist.total || players.length || 0;
              const pct = totalP > 0 ? Math.round((count / totalP) * 100) : 25;
              const isNext = conditionsDist.nextAssigned === val;

              return (
                <div
                  key={val}
                  onClick={() => handleUpdateX(val)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer relative ${
                    paramX === val
                      ? "bg-amber-500/15 border-amber-400/80 shadow-md shadow-amber-950/40 ring-1 ring-amber-400/50"
                      : "bg-slate-900/90 border-slate-700/80 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono font-black text-amber-300">
                      X = {val}
                    </span>
                    {isNext && (
                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                        NEXT
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline justify-between mt-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-bold font-mono text-white">
                        {count}
                      </span>
                      <span className="text-[9px] text-slate-400 font-sans">
                        {t("manager.playersCount", { count: "" }).trim()}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {pct}%
                    </span>
                  </div>

                  {/* Progress bar to show balance */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        val === 0
                          ? "bg-slate-400"
                          : val === 5
                          ? "bg-blue-400"
                          : val === 10
                          ? "bg-amber-400"
                          : "bg-purple-400"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(10, pct * 2))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer with Next Condition and Rebalance Button */}
          <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>{t("manager.nextAssignedCondition")}:</span>
              <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                X = {conditionsDist.nextAssigned}
              </span>
              {rebalanceMessage && (
                <span className="text-emerald-400 font-bold ml-2 animate-fade-in">
                  ✓ {rebalanceMessage}
                </span>
              )}
            </div>

            {players.length > 1 && (
              <button
                onClick={handleRebalanceConditions}
                disabled={isRebalancing}
                className="self-end sm:self-auto px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-[9px] transition-all flex items-center gap-1 disabled:opacity-50"
              >
                <RotateCw className={`w-3 h-3 ${isRebalancing ? "animate-spin" : ""}`} />
                {t("manager.rebalanceBtn")}
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs: Player Records Ledger (Primary) vs Academic Analysis Suite */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveConsoleTab("participants")}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeConsoleTab === "participants"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40 font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {t("manager.playerRecordsTab")} ({players.length} Players)
          </button>
          <button
            onClick={() => setActiveConsoleTab("analytics")}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
              activeConsoleTab === "analytics"
                ? "bg-blue-600 text-white shadow-md shadow-blue-900/40 font-black"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            {t("manager.analyticsTab")}
          </button>
        </div>
      </div>

      {/* Main Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {activeConsoleTab === "analytics" ? (
          <ResearchCharts
            analytics={analytics}
            onExportSummaryCsv={handleExportSummaryCsv}
            onExportSurgesCsv={handleExportSurgesCsv}
            onExportDispersionCsv={handleExportDispersionCsv}
            onExportTrialsCsv={handleExportCleanCsv}
          />
        ) : (
          /* Participant Profiles & Trial Logs View */
          <div className="space-y-4">
            {/* Action Bar: Title, Grouping Selector, Export Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-800/60 p-3 sm:p-4 rounded-2xl border border-slate-700/80 shadow-md">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                    {t("manager.playerRecordsTab")}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Complete record of all players: Name, Condition X, round results, bet selection, and wager amount.
                </p>
              </div>

              {/* Primary Export Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleExportGroupedByX()}
                  className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  title="Export all participant trials grouped by condition X with round results and bet details"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("manager.exportGroupedByX")}
                </button>
                <button
                  onClick={() => handleExportAllRawCsv()}
                  className="py-1.5 px-3 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  title="Export complete flat master records CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  {t("manager.exportAllRawCsv")}
                </button>
                <button
                  onClick={handleExportCleanCsv}
                  className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[10px] uppercase tracking-wider border border-slate-700 flex items-center gap-1"
                >
                  Clean Trials (CSV)
                </button>
              </div>
            </div>

            {/* Filter and View Mode Control Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              {/* Grouping Mode Switcher */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0 overflow-x-auto">
                <button
                  onClick={() => setDataGroupingMode("groupedX")}
                  className={`py-1 px-2.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    dataGroupingMode === "groupedX"
                      ? "bg-blue-600 text-white shadow-sm font-black"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  {t("manager.groupedByX")}
                </button>
                <button
                  onClick={() => setDataGroupingMode("table")}
                  className={`py-1 px-2.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    dataGroupingMode === "table"
                      ? "bg-blue-600 text-white shadow-sm font-black"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  {t("manager.allTrialsMasterTable")}
                </button>
                <button
                  onClick={() => setDataGroupingMode("byPlayer")}
                  className={`py-1 px-2.5 rounded-md text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    dataGroupingMode === "byPlayer"
                      ? "bg-blue-600 text-white shadow-sm font-black"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Users className="w-3 h-3" />
                  {t("manager.byParticipant")}
                </button>
              </div>

              {/* Condition X Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase px-1 hidden sm:inline">
                  {t("manager.filterByCondition")}:
                </span>
                {(["all", 0, 5, 10, 15] as const).map((xVal) => (
                  <button
                    key={String(xVal)}
                    onClick={() => setFilterConditionX(xVal)}
                    className={`py-1 px-2 rounded-md text-[10px] font-mono font-bold transition-all ${
                      filterConditionX === xVal
                        ? "bg-amber-500 text-slate-950 font-black shadow-sm"
                        : "bg-slate-800/80 hover:bg-slate-750 text-slate-400 border border-slate-700/60"
                    }`}
                  >
                    {xVal === "all" ? t("manager.allConditions") : `X=${xVal}`}
                  </button>
                ))}
              </div>

              {/* Participant Name Search */}
              <div className="relative min-w-[160px] sm:w-48">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchPlayerQuery}
                  onChange={(e) => setSearchPlayerQuery(e.target.value)}
                  placeholder="Search participant..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* VIEW 1: DATA GROUPED BY CONDITION X */}
            {dataGroupingMode === "groupedX" && (
              <div className="space-y-4">
                {(filterConditionX === "all" ? [0, 5, 10, 15] : [filterConditionX]).map((xVal) => {
                  // Collect all trials in this X condition across all matching participants
                  const conditionRounds: (TrialRecord & { pName: string; pUid: string })[] = [];
                  players.forEach((p) => {
                    const matchesSearch =
                      !searchPlayerQuery ||
                      p.name.toLowerCase().includes(searchPlayerQuery.toLowerCase()) ||
                      p.uid.toLowerCase().includes(searchPlayerQuery.toLowerCase());
                    if (!matchesSearch) return;

                    (p.trials || []).forEach((t) => {
                      const tX = t.paramX !== undefined ? t.paramX : (p.primaryX ?? 10);
                      if (tX === xVal) {
                        conditionRounds.push({
                          ...t,
                          pName: p.name,
                          pUid: p.uid,
                          paramX: tX,
                        });
                      }
                    });
                  });

                  // Sort rounds chronologically
                  conditionRounds.sort((a, b) =>
                    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                  );

                  const distinctPUids = new Set(conditionRounds.map((r) => r.pUid));
                  const totalWagered = conditionRounds.reduce((acc, r) => acc + r.amount, 0);
                  const totalWon = conditionRounds.reduce((acc, r) => acc + (r.payout || 0), 0);
                  const netPnL = totalWon - totalWagered;
                  const wins = conditionRounds.filter((r) => r.status === "won").length;
                  const winRate =
                    conditionRounds.length > 0 ? Math.round((wins / conditionRounds.length) * 100) : 0;
                  const avgBet =
                    conditionRounds.length > 0 ? Math.round(totalWagered / conditionRounds.length) : 0;
                  const isExpanded = expandedXSections[xVal] ?? true;

                  return (
                    <div
                      key={xVal}
                      className="rounded-2xl border border-slate-700/80 bg-slate-900/90 overflow-hidden shadow-lg"
                    >
                      {/* Condition Group Header Banner */}
                      <div
                        className="p-3.5 sm:p-4 bg-slate-800/80 border-b border-slate-700/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none hover:bg-slate-800 transition-colors"
                        onClick={() => toggleXSection(xVal)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs border shadow-sm ${
                              xVal === 0
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                : xVal === 5
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : xVal === 10
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                                : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            }`}
                          >
                            X={xVal}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs sm:text-sm font-black text-white">
                                {xVal === 0
                                  ? "Condition X = 0 (Immediate House Edge / 0 Fair Rounds)"
                                  : xVal === 5
                                  ? "Condition X = 5 (5 Initial Fair Rounds Baseline)"
                                  : xVal === 10
                                  ? "Condition X = 10 (10 Initial Fair Rounds - Standard)"
                                  : "Condition X = 15 (15 Extended Fair Rounds Baseline)"}
                              </h4>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-950/80 text-slate-300 border border-slate-700">
                                {distinctPUids.size} Participants
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-slate-400">
                              <span>
                                Total Rounds: <strong className="text-slate-200 font-mono">{conditionRounds.length}</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Total Wagered: <strong className="text-amber-300 font-mono">{totalWagered.toLocaleString()} PT</strong>
                              </span>
                              <span>•</span>
                              <span>
                                Win Rate: <strong className="text-slate-200 font-mono">{winRate}%</strong> ({wins}/{conditionRounds.length})
                              </span>
                              <span>•</span>
                              <span>
                                Net P&L:{" "}
                                <strong
                                  className={`font-mono ${
                                    netPnL >= 0 ? "text-emerald-400" : "text-rose-400"
                                  }`}
                                >
                                  {netPnL >= 0 ? `+${netPnL}` : netPnL} PT
                                </strong>
                              </span>
                              <span>•</span>
                              <span>
                                Avg Bet: <strong className="text-slate-300 font-mono">{avgBet} PT</strong>
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Condition Header Action & Expand Toggle */}
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleExportGroupedByX(xVal)}
                            className="py-1 px-2.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 border border-emerald-500/30 shadow-sm"
                            title={`Export all rounds in Condition X=${xVal}`}
                          >
                            <Download className="w-3 h-3" />
                            {t("manager.exportConditionX", { x: xVal })}
                          </button>
                          <button
                            onClick={() => toggleXSection(xVal)}
                            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-blue-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Condition Group Detailed Rounds Table */}
                      {isExpanded && (
                        <div className="p-3 sm:p-4">
                          {conditionRounds.length > 0 ? (
                            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                              <table className="w-full text-left text-[11px] font-mono">
                                <thead>
                                  <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] uppercase font-sans text-slate-400">
                                    <th className="py-2.5 px-3">Round #</th>
                                    <th className="py-2.5 px-3">Participant Name</th>
                                    <th className="py-2.5 px-2.5">X</th>
                                    <th className="py-2.5 px-3">{t("manager.whatBetOn")}</th>
                                    <th className="py-2.5 px-3">{t("manager.howMuchBet")}</th>
                                    <th className="py-2.5 px-3">{t("manager.roundResult")}</th>
                                    <th className="py-2.5 px-3">Outcome</th>
                                    <th className="py-2.5 px-3">{t("manager.netProfitLoss")}</th>
                                    <th className="py-2.5 px-3">{t("manager.balanceAfter")}</th>
                                    <th className="py-2.5 px-3">Timestamp</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/80">
                                  {conditionRounds.map((round, idx) => {
                                    const net = (round.payout || 0) - round.amount;
                                    const isWin = round.status === "won";
                                    return (
                                      <tr
                                        key={round.id || idx}
                                        className="hover:bg-slate-900/60 transition-colors"
                                      >
                                        <td className="py-2 px-3 text-slate-400 font-bold">
                                          #{round.roundNumber || idx + 1}
                                        </td>
                                        <td className="py-2 px-3 font-sans">
                                          <div className="font-bold text-white flex items-center gap-1.5">
                                            <span>{round.pName}</span>
                                            <span className="text-[9px] text-slate-500 font-mono">
                                              ({round.pUid.slice(0, 6)})
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-2.5">
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                            X={round.paramX}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                                round.value.toLowerCase() === "red"
                                                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                                  : round.value.toLowerCase() === "black"
                                                  ? "bg-slate-800 text-slate-200 border border-slate-700"
                                                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                              }`}
                                            >
                                              {round.value}
                                            </span>
                                            <span className="text-[9px] text-slate-500 uppercase font-sans">
                                              ({round.type})
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="flex items-center gap-1">
                                            <span className="font-bold text-amber-300">
                                              {round.amount.toLocaleString()} PT
                                            </span>
                                            {round.wagerProportion !== undefined && (
                                              <span className="text-[9px] text-slate-400">
                                                ({(round.wagerProportion * 100).toFixed(0)}%)
                                              </span>
                                            )}
                                          </div>
                                        </td>
                                        <td className="py-2 px-3">
                                          <div className="flex items-center gap-1.5">
                                            <span
                                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                                                round.winningColor?.toLowerCase() === "red"
                                                  ? "bg-rose-600"
                                                  : round.winningColor?.toLowerCase() === "black"
                                                  ? "bg-slate-900 border border-slate-700"
                                                  : "bg-emerald-600"
                                              }`}
                                            >
                                              {round.winningNumber || "?"}
                                            </span>
                                            <span className="text-[10px] capitalize text-slate-300">
                                              {round.winningColor || "?"}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-2 px-3 font-sans font-bold">
                                          <span
                                            className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                                              isWin
                                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                            }`}
                                          >
                                            {isWin ? (
                                              <>
                                                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                                WON (+{round.payout} PT)
                                              </>
                                            ) : (
                                              <>
                                                <XCircle className="w-2.5 h-2.5 text-rose-400" />
                                                LOST
                                              </>
                                            )}
                                          </span>
                                        </td>
                                        <td className="py-2 px-3">
                                          <span
                                            className={`font-bold ${
                                              net >= 0 ? "text-emerald-400" : "text-rose-400"
                                            }`}
                                          >
                                            {net >= 0 ? `+${net}` : net} PT
                                          </span>
                                        </td>
                                        <td className="py-2 px-3 text-slate-200">
                                          {round.balanceAfter !== undefined
                                            ? `${round.balanceAfter.toLocaleString()} PT`
                                            : "—"}
                                        </td>
                                        <td className="py-2 px-3 text-[10px] text-slate-500">
                                          {round.timestamp ? new Date(round.timestamp).toLocaleTimeString() : "—"}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="py-8 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800/80">
                              No recorded trials yet under Condition X = {xVal}.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* VIEW 2: UNIFIED MASTER RECORDS TABLE (ALL PLAYERS & ROUNDS) */}
            {dataGroupingMode === "table" && (() => {
              const masterTrials: (TrialRecord & { pName: string; pUid: string })[] = [];
              players.forEach((p) => {
                const matchesSearch =
                  !searchPlayerQuery ||
                  p.name.toLowerCase().includes(searchPlayerQuery.toLowerCase()) ||
                  p.uid.toLowerCase().includes(searchPlayerQuery.toLowerCase());
                if (!matchesSearch) return;

                (p.trials || []).forEach((t) => {
                  const tX = t.paramX !== undefined ? t.paramX : (p.primaryX ?? 10);
                  if (filterConditionX === "all" || tX === filterConditionX) {
                    masterTrials.push({
                      ...t,
                      pName: p.name,
                      pUid: p.uid,
                      paramX: tX,
                    });
                  }
                });
              });

              masterTrials.sort((a, b) => {
                const xA = a.paramX ?? 10;
                const xB = b.paramX ?? 10;
                if (xA !== xB) return xA - xB;
                if (a.pName !== b.pName) return a.pName.localeCompare(b.pName);
                return (a.roundNumber || 0) - (b.roundNumber || 0);
              });

              return (
                <div className="rounded-2xl border border-slate-700/80 bg-slate-900/90 overflow-hidden shadow-xl p-3.5 sm:p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue-400" />
                      <h4 className="text-xs sm:text-sm font-black text-white">
                        {t("manager.allTrialsMasterTable")}
                      </h4>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        {masterTrials.length} Records
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportGroupedByX()}
                        className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-sm"
                      >
                        <Download className="w-3 h-3" />
                        {t("manager.exportGroupedByX")}
                      </button>
                    </div>
                  </div>

                  {masterTrials.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                      <table className="w-full text-left text-[11px] font-mono">
                        <thead>
                          <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] uppercase font-sans text-slate-400">
                            <th className="py-2.5 px-3">Round #</th>
                            <th className="py-2.5 px-3">{t("manager.playerName")}</th>
                            <th className="py-2.5 px-2.5">X</th>
                            <th className="py-2.5 px-3">{t("manager.whatBetOn")}</th>
                            <th className="py-2.5 px-3">{t("manager.howMuchBet")}</th>
                            <th className="py-2.5 px-3">{t("manager.roundResult")}</th>
                            <th className="py-2.5 px-3">Outcome</th>
                            <th className="py-2.5 px-3">{t("manager.netProfitLoss")}</th>
                            <th className="py-2.5 px-3">{t("manager.balanceAfter")}</th>
                            <th className="py-2.5 px-3">Timestamp</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80">
                          {masterTrials.map((round, idx) => {
                            const net = (round.payout || 0) - round.amount;
                            const isWin = round.status === "won";
                            return (
                              <tr key={round.id || idx} className="hover:bg-slate-900/60 transition-colors">
                                <td className="py-2 px-3 text-slate-400 font-bold">
                                  #{round.roundNumber || idx + 1}
                                </td>
                                <td className="py-2 px-3 font-sans">
                                  <div className="font-bold text-white flex items-center gap-1.5">
                                    <span>{round.pName}</span>
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      ({round.pUid.slice(0, 6)})
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-2.5">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    X={round.paramX}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                        round.value.toLowerCase() === "red"
                                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                          : round.value.toLowerCase() === "black"
                                          ? "bg-slate-800 text-slate-200 border border-slate-700"
                                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                      }`}
                                    >
                                      {round.value}
                                    </span>
                                    <span className="text-[9px] text-slate-500 uppercase font-sans">
                                      ({round.type})
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-amber-300">
                                      {round.amount.toLocaleString()} PT
                                    </span>
                                    {round.wagerProportion !== undefined && (
                                      <span className="text-[9px] text-slate-400">
                                        ({(round.wagerProportion * 100).toFixed(0)}%)
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                                        round.winningColor?.toLowerCase() === "red"
                                          ? "bg-rose-600"
                                          : round.winningColor?.toLowerCase() === "black"
                                          ? "bg-slate-900 border border-slate-700"
                                          : "bg-emerald-600"
                                      }`}
                                    >
                                      {round.winningNumber || "?"}
                                    </span>
                                    <span className="text-[10px] capitalize text-slate-300">
                                      {round.winningColor || "?"}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-sans font-bold">
                                  <span
                                    className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                                      isWin
                                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                        : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                    }`}
                                  >
                                    {isWin ? (
                                      <>
                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                        WON (+{round.payout} PT)
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="w-2.5 h-2.5 text-rose-400" />
                                        LOST
                                      </>
                                    )}
                                  </span>
                                </td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`font-bold ${
                                      net >= 0 ? "text-emerald-400" : "text-rose-400"
                                    }`}
                                  >
                                    {net >= 0 ? `+${net}` : net} PT
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-200">
                                  {round.balanceAfter !== undefined
                                    ? `${round.balanceAfter.toLocaleString()} PT`
                                    : "—"}
                                </td>
                                <td className="py-2 px-3 text-[10px] text-slate-500">
                                  {round.timestamp ? new Date(round.timestamp).toLocaleTimeString() : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800">
                      No recorded player trials found matching the criteria.
                    </div>
                  )}
                </div>
              );
            })()}

            {/* VIEW 3: INDIVIDUAL PARTICIPANTS VIEW */}
            {dataGroupingMode === "byPlayer" && (
              <div className="space-y-3">
                {players
                  .filter((p) => {
                    const matchesSearch =
                      !searchPlayerQuery ||
                      p.name.toLowerCase().includes(searchPlayerQuery.toLowerCase()) ||
                      p.uid.toLowerCase().includes(searchPlayerQuery.toLowerCase());
                    const playerCond = p.assignedX !== undefined ? p.assignedX : (p.primaryX ?? 10);
                    const matchesX =
                      filterConditionX === "all" ||
                      playerCond === filterConditionX ||
                      (p.trials && p.trials.some((t) => (t.paramX !== undefined ? t.paramX : 10) === filterConditionX));
                    return matchesSearch && matchesX;
                  })
                  .map((p) => {
                    const isSelected = selectedPlayerUid === p.uid;
                    const conditionDisplay = p.assignedX !== undefined ? p.assignedX : (p.primaryX !== undefined ? p.primaryX : 10);
                    return (
                      <div
                        key={p.uid}
                        className={`rounded-2xl border transition-all ${
                          isSelected
                            ? "bg-slate-800/95 border-blue-500 shadow-xl ring-1 ring-blue-500/50"
                            : "bg-slate-900/80 border-slate-800 hover:bg-slate-850 hover:border-slate-700"
                        }`}
                      >
                        {/* Header Row */}
                        <div
                          className="p-3.5 sm:p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none"
                          onClick={() => setSelectedPlayerUid(isSelected ? null : p.uid)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-blue-400 text-xs font-mono">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs sm:text-sm text-white">{p.name}</span>
                                <span className="text-[9px] text-slate-400 font-mono">
                                  (UID: {p.uid.slice(0, 8)})
                                </span>
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  Condition X={conditionDisplay}
                                </span>
                                {p.hasLeft || p.chips <= 0 ? (
                                  <span className="px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-bold tracking-tight">
                                    {p.leftReason === "voluntarily_left" ? "Left Study (Concluded)" : "Bankrupt (Concluded)"}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold tracking-tight">
                                    Active Session
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>{p.totalBets} trials</span>
                                <span>•</span>
                                <span className="text-slate-400">Final PT:</span>
                                <span
                                  className={`font-bold font-mono ${
                                    (p.finalPt !== undefined ? p.finalPt : p.chips) <= 0 ? "text-rose-400" : "text-emerald-400"
                                  }`}
                                >
                                  {(p.finalPt !== undefined ? p.finalPt : p.chips).toLocaleString()} PT
                                </span>
                                <span>•</span>
                                <span className="font-mono">
                                  {p.netPnL >= 0 ? `+${p.netPnL}` : p.netPnL} PT ({p.winRate}%)
                                </span>
                                <span>•</span>
                                <span>Total Wagered: {p.totalWagered.toLocaleString()} PT</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleExportPlayerTrialsCsv(p)}
                              className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[10px] uppercase tracking-wider border border-slate-700 flex items-center gap-1 shadow-sm"
                              title="Export this player's trial records to CSV"
                            >
                              <Download className="w-3 h-3" />
                              Export (CSV)
                            </button>
                            <button
                              onClick={() => handleDeleteParticipant(p)}
                              className="py-1 px-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-rose-100 font-bold text-[10px] border border-rose-700/60 flex items-center gap-1 shadow-sm transition-all"
                              title={`Delete participant ${p.name}`}
                            >
                              <Trash2 className="w-3 h-3 text-rose-400" />
                              <span className="hidden xs:inline">Delete</span>
                            </button>
                            <button
                              onClick={() => setSelectedPlayerUid(isSelected ? null : p.uid)}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              {isSelected ? (
                                <ChevronUp className="w-4 h-4 text-blue-400" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Detailed Trial Log (Collapsible) */}
                        {isSelected && (
                          <div className="px-3.5 pb-4 pt-1 border-t border-slate-800 bg-slate-950/60 rounded-b-2xl text-[10px]">
                            <div className="font-bold uppercase tracking-wider text-slate-400 mb-2.5 pt-2 flex items-center justify-between">
                              <span className="flex items-center gap-2">
                                <span>{t("manager.trialDetails", { name: p.name })}</span>
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                                  Condition X={conditionDisplay}
                                </span>
                              </span>
                              <span className="text-slate-500">{p.trials?.length || 0} Records</span>
                            </div>

                            {p.trials && p.trials.length > 0 ? (
                              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                                <table className="w-full text-left text-[11px] font-mono">
                                  <thead>
                                    <tr className="border-b border-slate-800 bg-slate-900/90 text-[10px] uppercase font-sans text-slate-400">
                                      <th className="py-2 px-3">Round #</th>
                                      <th className="py-2 px-2.5">X</th>
                                      <th className="py-2 px-3">{t("manager.whatBetOn")}</th>
                                      <th className="py-2 px-3">{t("manager.howMuchBet")}</th>
                                      <th className="py-2 px-3">{t("manager.roundResult")}</th>
                                      <th className="py-2 px-3">Outcome</th>
                                      <th className="py-2 px-3">{t("manager.netProfitLoss")}</th>
                                      <th className="py-2 px-3">{t("manager.balanceAfter")}</th>
                                      <th className="py-2 px-3">Timestamp</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/80">
                                    {p.trials.map((trial: any, idx: number) => {
                                      const net = (trial.payout || 0) - trial.amount;
                                      const isWin = trial.status === "won";
                                      return (
                                        <tr key={trial.id || idx} className="hover:bg-slate-900/50">
                                          <td className="py-2 px-3 text-slate-400 font-bold">
                                            #{trial.roundNumber || idx + 1}
                                          </td>
                                          <td className="py-2 px-2.5">
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                              X={trial.paramX !== undefined ? trial.paramX : conditionDisplay}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3">
                                            <div className="flex items-center gap-1.5">
                                              <span
                                                className={`px-1.5 py-0.5 rounded font-bold text-[10px] ${
                                                  trial.value.toLowerCase() === "red"
                                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                                    : trial.value.toLowerCase() === "black"
                                                    ? "bg-slate-800 text-slate-200 border border-slate-700"
                                                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                                }`}
                                              >
                                                {trial.value}
                                              </span>
                                              <span className="text-[9px] text-slate-500 font-sans uppercase">
                                                ({trial.type})
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2 px-3">
                                            <span className="font-bold text-amber-300">
                                              {trial.amount.toLocaleString()} PT
                                            </span>
                                            {trial.wagerProportion !== undefined && (
                                              <span className="text-[9px] text-slate-400 ml-1">
                                                ({(trial.wagerProportion * 100).toFixed(0)}%)
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-2 px-3">
                                            <div className="flex items-center gap-1.5">
                                              <span
                                                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                                                  trial.winningColor?.toLowerCase() === "red"
                                                    ? "bg-rose-600"
                                                    : trial.winningColor?.toLowerCase() === "black"
                                                    ? "bg-slate-900 border border-slate-700"
                                                    : "bg-emerald-600"
                                                }`}
                                              >
                                                {trial.winningNumber || "?"}
                                              </span>
                                              <span className="text-[10px] capitalize text-slate-300">
                                                {trial.winningColor || "?"}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2 px-3 font-sans font-bold">
                                            <span
                                              className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                                                isWin
                                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                                  : "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                              }`}
                                            >
                                              {isWin ? (
                                                <>
                                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                                                  WON (+{trial.payout} PT)
                                                </>
                                              ) : (
                                                <>
                                                  <XCircle className="w-2.5 h-2.5 text-rose-400" />
                                                  LOST
                                                </>
                                              )}
                                            </span>
                                          </td>
                                          <td className="py-2 px-3">
                                            <span
                                              className={`font-bold ${
                                                net >= 0 ? "text-emerald-400" : "text-rose-400"
                                              }`}
                                            >
                                              {net >= 0 ? `+${net}` : net} PT
                                            </span>
                                          </td>
                                          <td className="py-2 px-3 text-slate-200">
                                            {trial.balanceAfter !== undefined
                                              ? `${trial.balanceAfter.toLocaleString()} PT`
                                              : "—"}
                                          </td>
                                          <td className="py-2 px-3 text-[10px] text-slate-500">
                                            {trial.timestamp
                                              ? new Date(trial.timestamp).toLocaleTimeString()
                                              : "—"}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-slate-500 italic py-3 text-center text-[10px]">
                                {t("manager.noTrials")}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                {players.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs italic bg-slate-800/30 rounded-2xl border border-slate-800">
                    {t("manager.awaiting")}
                  </div>
                )}
              </div>
            )}

            {/* Persistence Guarantee & Explicit Data Deletion Zone */}
            <div className="mt-6 p-4 rounded-xl border border-rose-900/40 bg-rose-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  Study Data Persistence & Deletion Control
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 max-w-xl">
                  Participant data and trials are permanently saved in the server database across all page reloads.
                  Data is never automatically removed unless you explicitly initiate a reset.
                </p>
              </div>

              <button
                onClick={() => {
                  setResetError(null);
                  setResetSuccess(null);
                  setResetPassword("");
                  setResetConfirmation("");
                  setShowResetModal(true);
                }}
                className="px-3 py-2 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-rose-200 border border-rose-700/50 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Delete Study Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Explicit Delete / Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-600/50 rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  Delete All Study Data
                </h3>
                <p className="text-[11px] text-slate-400">
                  Irreversible action for the study database
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              This will permanently delete all registered participant records, trials, and leaderboard entries from the study database (<code className="text-rose-300 font-mono">study_store.json</code>).
            </p>

            <form onSubmit={handleResetStudyData} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Manager Password
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="Enter manager password"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-rose-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">
                  Type <span className="font-mono text-rose-300">DELETE_ALL_DATA</span> to confirm
                </label>
                <input
                  type="text"
                  value={resetConfirmation}
                  onChange={(e) => setResetConfirmation(e.target.value)}
                  placeholder="DELETE_ALL_DATA"
                  required
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-rose-500 font-mono"
                />
              </div>

              {resetError && (
                <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{resetSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={isResetting}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || resetConfirmation !== "DELETE_ALL_DATA" || !resetPassword}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-xs font-bold text-white uppercase tracking-wider transition-colors shadow-lg shadow-rose-950/50 flex items-center gap-1.5"
                >
                  {isResetting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      Confirm Delete
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

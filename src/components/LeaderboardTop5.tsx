import React from "react";
import { Trophy, Medal, Crown, Award, User, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../lib/i18n";
import { LeaderboardPlayer } from "../types";

interface LeaderboardTop5Props {
  leaderboard: LeaderboardPlayer[];
  currentUid?: string;
  currentName?: string;
  className?: string;
}

export default function LeaderboardTop5({
  leaderboard = [],
  currentUid = "",
  currentName = "",
  className = "",
}: LeaderboardTop5Props) {
  const { t } = useLanguage();

  // Ensure only 3 slots are shown (TOP 3)
  const paddedSlots: Array<LeaderboardPlayer | { rank: number; isOpen: true }> = [];
  for (let i = 1; i <= 3; i++) {
    const existing = leaderboard.find((p) => p.rank === i);
    if (existing) {
      paddedSlots.push(existing);
    } else {
      paddedSlots.push({ rank: i, isOpen: true });
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-sm ring-1 ring-amber-300 shrink-0">
            <Crown className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          </div>
        );
      case 2:
        return (
          <div className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900 flex items-center justify-center font-black shadow-sm ring-1 ring-slate-200 shrink-0">
            <Medal className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          </div>
        );
      case 3:
        return (
          <div className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100 flex items-center justify-center font-black shadow-sm ring-1 ring-amber-600/50 shrink-0">
            <Award className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          </div>
        );
      default:
        return (
          <div className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center font-mono font-bold text-[8px] sm:text-[9px] shrink-0">
            {rank}
          </div>
        );
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Leaderboard Header */}
      <div className="px-1.5 py-1 sm:px-2.5 sm:py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 shrink-0">
        <div className="flex items-center gap-1 min-w-0">
          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
            <Trophy className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-100 flex items-center gap-1 leading-none truncate">
              <span className="truncate">{t("leaderboard.title")}</span>
              <span className="text-[6.5px] sm:text-[8px] bg-amber-500/25 text-amber-300 px-0.5 py-0.2 rounded font-mono font-bold shrink-0">
                TOP 3
              </span>
            </h4>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[7px] sm:text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-wider hidden sm:inline">
            {t("leaderboard.live")}
          </span>
        </div>
      </div>

      {/* Leaderboard Rows - Only Top 3 slots */}
      <div className="p-1 sm:p-2 space-y-1 overflow-y-auto flex-1 flex flex-col justify-around">
        {paddedSlots.map((item, idx) => {
          const isSlotOpen = "isOpen" in item;
          const isCurrentUser =
            !isSlotOpen &&
            ((currentUid && item.uid === currentUid) ||
              (currentName && item.name.toLowerCase() === currentName.trim().toLowerCase()));

          if (isSlotOpen) {
            return (
              <div
                key={`empty-${item.rank}`}
                className="py-1 px-1 sm:px-1.5 rounded-lg border border-dashed border-slate-800/70 bg-slate-950/20 flex items-center justify-between opacity-40 text-[8px] sm:text-[9px]"
              >
                <div className="flex items-center gap-1 min-w-0">
                  <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded bg-slate-900 text-slate-600 border border-slate-800 flex items-center justify-center font-mono font-bold text-[8px] shrink-0">
                    {item.rank}
                  </div>
                  <span className="text-[7px] sm:text-[8px] text-slate-500 italic font-mono truncate">
                    {t("leaderboard.openSlot")}
                  </span>
                </div>
                <span className="text-[7px] sm:text-[8px] font-mono text-slate-600 shrink-0">--</span>
              </div>
            );
          }

          return (
            <motion.div
              key={item.uid || idx}
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15, delay: idx * 0.03 }}
              className={`py-1 px-1 sm:py-1.5 sm:px-1.5 rounded-lg border transition-all flex items-center justify-between gap-1 ${
                isCurrentUser
                  ? "bg-emerald-950/40 border-emerald-500/60 shadow-sm ring-1 ring-emerald-500/30"
                  : item.rank === 1
                  ? "bg-amber-950/25 border-amber-500/40"
                  : "bg-slate-900/60 border-slate-800/80 hover:border-slate-750"
              }`}
            >
              {/* Rank & Participant Info */}
              <div className="flex items-center gap-1 min-w-0 flex-1">
                {getRankBadge(item.rank)}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-0.5 min-w-0">
                    <span
                      className={`text-[9px] sm:text-xs font-bold truncate block ${
                        isCurrentUser
                          ? "text-emerald-300"
                          : item.rank === 1
                          ? "text-amber-200"
                          : "text-slate-200"
                      }`}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    {isCurrentUser && (
                      <span className="text-[6px] font-black uppercase px-0.5 py-0.2 rounded bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shrink-0">
                        {t("leaderboard.you")}
                      </span>
                    )}
                  </div>
                  <span className="text-[6.5px] sm:text-[7.5px] text-slate-400 font-mono block leading-none truncate hidden sm:block">
                    {t("leaderboard.trials", { count: item.totalBets })}
                  </span>
                </div>
              </div>

              {/* Final Balance / Units */}
              <div className="text-right shrink-0">
                <span
                  className={`text-[9px] sm:text-xs font-black font-mono block leading-tight ${
                    item.rank === 1
                      ? "text-amber-400"
                      : isCurrentUser
                      ? "text-emerald-400"
                      : "text-slate-100"
                  }`}
                >
                  {((item.finalPt !== undefined ? item.finalPt : item.chips) ?? 0).toLocaleString()}
                  <span className="text-[6.5px] sm:text-[7.5px] font-normal text-slate-400 ml-0.5">PT</span>
                </span>
                <span className="text-[6px] sm:text-[7px] text-slate-400 font-mono block leading-none">
                  {item.hasLeft ? t("leaderboard.finalStatus") : t("leaderboard.activeStatus")}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Live Sync Footer Notice */}
      <div className="px-1.5 py-0.5 border-t border-slate-800/80 bg-slate-950/60 text-center shrink-0">
        <span className="text-[6px] text-slate-500 uppercase tracking-widest flex items-center justify-center gap-1 font-mono">
          <Sparkles className="w-1.5 h-1.5 text-amber-400" />
          <span>Sync</span>
        </span>
      </div>
    </div>
  );
}

export { LeaderboardTop5 as LeaderboardTop3 };

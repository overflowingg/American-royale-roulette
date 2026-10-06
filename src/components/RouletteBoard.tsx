import React from "react";
import { cn } from "../lib/utils";
import { BetType } from "../types";
import { useLanguage } from "../lib/i18n";
import { FlaskConical, Lock, ShieldCheck, Coins } from "lucide-react";

interface RouletteBoardProps {
  onPlaceBet: (type: BetType, value: string, amount?: number) => void;
  bets: { value: string; amount: number }[];
  selectedChip: number;
  onSelectChip: (chip: number) => void;
  disabled?: boolean;
}

const CHIP_DENOMINATIONS = [
  { value: 10, color: "bg-blue-600 hover:bg-blue-500 border-blue-400 text-white" },
  { value: 25, color: "bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white" },
  { value: 50, color: "bg-amber-600 hover:bg-amber-500 border-amber-400 text-white" },
  { value: 100, color: "bg-purple-600 hover:bg-purple-500 border-purple-400 text-white" },
  { value: 250, color: "bg-rose-700 hover:bg-rose-600 border-rose-400 text-white" },
];

export default function RouletteBoard({
  onPlaceBet,
  bets,
  selectedChip,
  onSelectChip,
  disabled = false,
}: RouletteBoardProps) {
  const { t } = useLanguage();

  const getBetAmount = (value: string) =>
    bets.find((b) => b.value.toLowerCase() === value.toLowerCase())?.amount || 0;

  const redBet = getBetAmount("Red");
  const blackBet = getBetAmount("Black");

  return (
    <div className="w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-5 shadow-2xl backdrop-blur-md space-y-3 sm:space-y-4">
      {/* Study Mode Indicator Header & Chip Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <FlaskConical className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-amber-400">
                {t("study.bannerTitle")}
              </h2>
              <span className="px-1.5 py-0.2 rounded text-[8px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-tight">
                Red & Black
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-tight">
              {t("study.bannerDesc")}
            </p>
          </div>
        </div>

        {/* Chip Denomination Selector */}
        <div className="flex items-center gap-1.5 self-center sm:self-auto bg-slate-950/70 p-1 sm:p-1.5 rounded-xl border border-slate-800">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 px-1 hidden md:inline">
            {t("board.chipSelect")}:
          </span>
          <div className="flex items-center gap-1.5">
            {CHIP_DENOMINATIONS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => onSelectChip(chip.value)}
                disabled={disabled}
                className={cn(
                  "w-9 h-9 sm:w-10 sm:h-10 rounded-full font-mono text-[11px] sm:text-xs font-black border-2 transition-all transform flex items-center justify-center shadow-md active:scale-95 touch-manipulation",
                  chip.color,
                  selectedChip === chip.value
                    ? "scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-900 z-10"
                    : "opacity-60 hover:opacity-100"
                )}
                title={`${chip.value} PT`}
              >
                {chip.value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Betting Area: Ergonomic Side-by-Side on Phone (grid-cols-2) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {/* RED BETTING CARD */}
        <div
          className={cn(
            "relative group rounded-xl border-2 transition-all p-3 sm:p-4 flex flex-col justify-between overflow-hidden touch-manipulation select-none active:scale-[0.98]",
            "bg-gradient-to-br from-red-950/90 via-red-900/60 to-red-950/90",
            "border-red-700/70 hover:border-red-500 shadow-lg shadow-red-950/40",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
          onClick={() => !disabled && onPlaceBet("color", "Red", selectedChip)}
        >
          {/* Background Decorative Accent */}
          <div className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full bg-red-600/10 blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50 shrink-0" />
                <span className="text-base sm:text-xl font-black font-sans tracking-wider text-white">
                  {t("board.redTitle")}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300 text-[9px] font-mono font-black uppercase">
                1:1
              </span>
            </div>

            <p className="text-[10px] text-red-200/80 font-medium leading-tight hidden xs:block mb-2">
              {t("board.redDetail")}
            </p>
          </div>

          <div className="pt-2 sm:pt-3 border-t border-red-900/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-red-300/70 tracking-wider">
                {t("board.allocated")}
              </span>
              <div className="text-sm sm:text-base font-mono font-black text-white flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400 inline" />
                <span>{redBet > 0 ? `${redBet} PT` : "0 PT"}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onPlaceBet("color", "Red", selectedChip);
              }}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-wider transition-transform active:scale-95 shadow-md shadow-red-950/60"
            >
              +{selectedChip} PT
            </button>
          </div>
        </div>

        {/* BLACK BETTING CARD */}
        <div
          className={cn(
            "relative group rounded-xl border-2 transition-all p-3 sm:p-4 flex flex-col justify-between overflow-hidden touch-manipulation select-none active:scale-[0.98]",
            "bg-gradient-to-br from-slate-950/95 via-neutral-900/85 to-slate-950/95",
            "border-slate-700/80 hover:border-slate-500 shadow-lg shadow-black/60",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
          onClick={() => !disabled && onPlaceBet("color", "Black", selectedChip)}
        >
          {/* Background Decorative Accent */}
          <div className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full bg-slate-700/10 blur-xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full bg-slate-950 border border-slate-500 shadow-sm shrink-0" />
                <span className="text-base sm:text-xl font-black font-sans tracking-wider text-white">
                  {t("board.blackTitle")}
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700 text-slate-300 text-[9px] font-mono font-black uppercase">
                1:1
              </span>
            </div>

            <p className="text-[10px] text-slate-300/80 font-medium leading-tight hidden xs:block mb-2">
              {t("board.blackDetail")}
            </p>
          </div>

          <div className="pt-2 sm:pt-3 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                {t("board.allocated")}
              </span>
              <div className="text-sm sm:text-base font-mono font-black text-white flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400 inline" />
                <span>{blackBet > 0 ? `${blackBet} PT` : "0 PT"}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onPlaceBet("color", "Black", selectedChip);
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-wider transition-transform active:scale-95 shadow-md shadow-black/60"
            >
              +{selectedChip} PT
            </button>
          </div>
        </div>
      </div>

      {/* Locked Methods Notice */}
      <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl px-3 py-2 flex items-center gap-2 text-slate-500 text-[10px] font-medium">
        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span className="text-[10px] text-slate-400">
          {t("board.otherLocked")}
        </span>
      </div>
    </div>
  );
}

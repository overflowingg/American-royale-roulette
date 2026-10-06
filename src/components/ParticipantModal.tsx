import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../lib/i18n";
import { UserCheck, AlertCircle, CheckCircle2, RotateCw, FlaskConical, X, ShieldCheck, Lock } from "lucide-react";
import LanguageToggle from "./LanguageToggle";

interface ParticipantModalProps {
  isOpen: boolean;
  currentName?: string;
  currentUid?: string;
  onSuccess: (player: { uid: string; name: string; email: string; chips: number; isManager?: boolean }) => void;
  onClose?: () => void;
  canClose?: boolean;
}

export default function ParticipantModal({
  isOpen,
  currentName = "",
  currentUid = "",
  onSuccess,
  onClose,
  canClose = false,
}: ParticipantModalProps) {
  const { t } = useLanguage();
  const [name, setName] = useState(currentName);
  const [password, setPassword] = useState("");
  const [isManagerMode, setIsManagerMode] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [customError, setCustomError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [existingInfo, setExistingInfo] = useState<{ chips: number; totalBets: number } | null>(null);
  const [concludedInfo, setConcludedInfo] = useState<{ chips: number; totalBets: number } | null>(null);
  const checkTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (isOpen) {
      setName(currentName);
      setPassword("");
      setIsManagerMode(currentName.toLowerCase() === "manager");
      setErrorKey(null);
      setCustomError(null);
      setIsAvailable(null);
      setExistingInfo(null);
      setConcludedInfo(null);
    }
  }, [isOpen, currentName]);

  // Check if name is "manager" to prompt for password
  useEffect(() => {
    const trimmed = name.trim().toLowerCase();
    if (trimmed === "manager") {
      setIsManagerMode(true);
      setIsAvailable(true);
      setExistingInfo(null);
      setConcludedInfo(null);
      setErrorKey(null);
      setCustomError(null);
    } else {
      setIsManagerMode(false);
    }
  }, [name]);

  // Debounced check for participant name
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setIsAvailable(null);
      setExistingInfo(null);
      setConcludedInfo(null);
      setErrorKey(null);
      setCustomError(null);
      return;
    }

    if (trimmed.toLowerCase() === "manager") {
      setIsAvailable(true);
      setExistingInfo(null);
      setConcludedInfo(null);
      setErrorKey(null);
      setCustomError(null);
      return;
    }

    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(async () => {
      setIsChecking(true);
      setErrorKey(null);
      setCustomError(null);
      setConcludedInfo(null);
      try {
        const res = await fetch(
          `/api/players/check-name?name=${encodeURIComponent(trimmed)}&uid=${encodeURIComponent(currentUid)}`
        );
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.includes("application/json")) {
          return;
        }
        const data = await res.json();
        if (data.available) {
          setIsAvailable(true);
          setErrorKey(null);
          setCustomError(null);
          setConcludedInfo(null);
          if (data.isExistingPlayer) {
            setExistingInfo({ chips: data.chips, totalBets: data.totalBets });
          } else {
            setExistingInfo(null);
          }
        } else {
          setIsAvailable(false);
          setExistingInfo(null);
          if (data.isConcluded) {
            setErrorKey("register.sessionConcluded");
            setConcludedInfo({ chips: data.chips, totalBets: data.totalBets });
          } else {
            setErrorKey(data.reasonKey || "register.nameTaken");
          }
        }
      } catch (e) {
        console.error("Check name error", e);
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [name, currentUid, t]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setErrorKey("register.nameTooShort");
      setCustomError(null);
      return;
    }

    setIsSubmitting(true);
    setErrorKey(null);
    setCustomError(null);

    try {
      // If manager mode, verify password (123456)
      if (trimmed.toLowerCase() === "manager") {
        if (!password.trim()) {
          setErrorKey("register.isManagerPrompt");
          setCustomError(null);
          setIsSubmitting(false);
          return;
        }

        try {
          const res = await fetch("/api/manager/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: "manager",
              password: password.trim(),
            }),
          });

          const ctLogin = res.headers.get("content-type") || "";
          if (res.ok && ctLogin.includes("application/json")) {
            const data = await res.json();
            if (!data.success) {
              setErrorKey("manager.wrongPassword");
              setCustomError(null);
            } else {
              onSuccess(data.player);
            }
            return;
          }
        } catch {
          // Static hosting / offline fallback
        }

        // Standalone verification for password 123456
        if (password.trim() === "123456") {
          onSuccess({
            uid: "manager_root",
            name: "manager",
            email: "manager@vantage.admin",
            chips: 10000,
            isManager: true,
            registeredAt: new Date().toISOString(),
            lastActive: new Date().toISOString(),
            totalBets: 0,
          });
        } else {
          setErrorKey("manager.wrongPassword");
          setCustomError(null);
        }
        return;
      }

      // Regular participant registration
      try {
        const res = await fetch("/api/players/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmed,
            uid: currentUid || undefined,
          }),
        });

        const ctReg = res.headers.get("content-type") || "";
        if (res.ok && ctReg.includes("application/json")) {
          const data = await res.json();
          if (!data.success) {
            setErrorKey(data.reasonKey || "register.nameTaken");
          } else {
            onSuccess(data.player);
          }
          return;
        }
      } catch {
        // Static hosting fallback
      }

      // Fallback for static hosting
      const localStoreKey = "vantage_static_players";
      const rawPlayers = localStorage.getItem(localStoreKey);
      const staticPlayers: Record<string, any> = rawPlayers ? JSON.parse(rawPlayers) : {};
      
      const newPlayer = {
        uid: currentUid || "sub_" + Math.random().toString(36).substring(2, 9),
        name: trimmed,
        email: `${trimmed}@study.subject`,
        chips: 1000,
        isManager: false,
        registeredAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalBets: 0,
        assignedX: [0, 5, 10, 15][Object.keys(staticPlayers).length % 4],
      };
      staticPlayers[newPlayer.uid] = newPlayer;
      localStorage.setItem(localStoreKey, JSON.stringify(staticPlayers));
      onSuccess(newPlayer);
    } catch {
      setErrorKey("register.networkError");
    } finally {
      setIsSubmitting(false);
    }
    } catch {
      setErrorKey("register.networkError");
      setCustomError(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchToManager = () => {
    setName("manager");
    setIsManagerMode(true);
    setPassword("");
    setErrorKey(null);
    setCustomError(null);
  };

  const displayError = errorKey ? t(errorKey) : customError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Top header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isManagerMode 
                ? "bg-blue-500/10 border border-blue-500/30 text-blue-400" 
                : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
            }`}>
              {isManagerMode ? <ShieldCheck className="w-5 h-5" /> : <FlaskConical className="w-5 h-5" />}
            </div>
            {isManagerMode && (
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold tracking-wider uppercase border border-blue-500/30">
                {t("manager.testModeBadge")}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            {canClose && onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-2 mb-6">
          <h2 className="text-lg sm:text-xl font-sans font-black text-white uppercase tracking-tight flex items-center gap-2">
            {isManagerMode ? (
              <>
                <ShieldCheck className="w-5 h-5 text-blue-400" />
                {t("manager.loginTitle")}
              </>
            ) : (
              <>
                <UserCheck className="w-5 h-5 text-emerald-400" />
                {t("register.title")}
              </>
            )}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            {isManagerMode ? t("manager.loginDesc") : t("register.subtitle")}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2">
              {isManagerMode ? t("manager.idLabel") : t("register.inputLabel")}
            </label>
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isManagerMode ? "manager" : t("register.placeholder")}
                maxLength={32}
                className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3.5 text-sm text-white font-medium placeholder:text-slate-600 outline-none transition-all pr-10"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {isChecking && <RotateCw className="w-4 h-4 animate-spin text-amber-400" />}
                {!isChecking && !isManagerMode && isAvailable === true && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                )}
                {!isChecking && isAvailable === false && (
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                )}
              </div>
            </div>

            {/* Validation feedback for participant */}
            {!isManagerMode && isAvailable === true && !displayError && (
              existingInfo ? (
                <div className="mt-2 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center justify-between animate-in fade-in duration-150">
                  <div className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{t("register.existingRecordFound")}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-200 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/50">
                    {existingInfo.chips.toLocaleString()} PT · {t("leaderboard.trials", { count: existingInfo.totalBets })}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {t("register.nameAvailable")}
                </p>
              )
            )}
          </div>

          {/* Password field - Only appears for Manager ID */}
          {isManagerMode && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-[11px] uppercase font-bold text-blue-400 tracking-wider mb-2 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                {t("manager.passwordLabel")}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("manager.passwordPlaceholder")}
                className="w-full bg-slate-950/80 border border-blue-500/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 outline-none transition-all"
              />
              <p className="mt-2 text-[11px] text-blue-300/80 leading-tight">
                {t("manager.testModeNotice")}
              </p>
            </div>
          )}

          {displayError && (
            errorKey === "register.sessionConcluded" ? (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-600/50 text-rose-200 text-[11px] space-y-1.5 animate-in fade-in duration-150">
                <div className="flex items-center gap-2 font-bold text-rose-300 uppercase tracking-wider text-[10px]">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{t("register.sessionConcludedBadge")}</span>
                </div>
                <p className="leading-relaxed text-rose-200/90 font-medium">
                  {displayError}
                </p>
                {concludedInfo && (
                  <div className="pt-1 flex items-center gap-2 text-[10px] text-rose-300/80 font-mono">
                    <span>{t("gameover.endingBalance")}: {concludedInfo.chips} PT</span>
                    <span>•</span>
                    <span>{t("gameover.roundsPlayed")}: {concludedInfo.totalBets}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-rose-400 flex items-start gap-1.5 font-medium leading-tight bg-rose-950/20 border border-rose-800/40 p-2.5 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
                {displayError}
              </p>
            )
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isChecking ||
                !name.trim() ||
                (isManagerMode && !password.trim()) ||
                (!isManagerMode && isAvailable === false)
              }
              className={`w-full py-3.5 px-6 rounded-xl text-white font-bold uppercase tracking-wider text-xs transition-all shadow-lg flex items-center justify-center gap-2 ${
                isManagerMode
                  ? "bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-blue-950/40"
                  : "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-emerald-950/40"
              }`}
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  {t("register.verifying")}
                </>
              ) : isManagerMode ? (
                t("manager.loginBtn")
              ) : existingInfo ? (
                t("register.resumeSession")
              ) : (
                t("register.submit")
              )}
            </button>
          </div>

          {/* Quick link to switch between participant registration and manager login */}
          <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
            {isManagerMode ? (
              <button
                type="button"
                onClick={() => {
                  setName("");
                  setPassword("");
                  setIsManagerMode(false);
                  setErrorKey(null);
                  setCustomError(null);
                }}
                className="text-slate-400 hover:text-emerald-400 transition-colors font-medium"
              >
                ← {t("manager.switchToParticipant")}
              </button>
            ) : (
              <button
                type="button"
                onClick={switchToManager}
                className="text-slate-400 hover:text-blue-400 transition-colors font-medium flex items-center gap-1"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                {t("manager.switchToManager")}
              </button>
            )}
            <span className="text-slate-600 font-mono text-[10px]">
              {t("manager.idHint")}
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from "react";
import { useLanguage } from "../lib/i18n";
import { UserCheck, AlertCircle, CheckCircle2, RotateCw, ShieldCheck, Lock, ArrowLeft } from "lucide-react";
import LanguageToggle from "./LanguageToggle";
import { cn } from "../lib/utils";
import { isFirebaseConfigured, savePlayerToCloud, fetchCloudPlayerByName, getBalancedNextConditionX, PlayerData } from "../lib/firebase";

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
  const { t, language } = useLanguage();
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

  // Check if participant typed "manager" into the name box to transition to manager login
  useEffect(() => {
    const trimmed = name.trim().toLowerCase();
    if (trimmed === "manager") {
      setIsManagerMode(true);
      setIsAvailable(true);
      setExistingInfo(null);
      setConcludedInfo(null);
      setErrorKey(null);
      setCustomError(null);
    }
  }, [name]);

  // Debounced check for participant name uniqueness across cloud and local state
  useEffect(() => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2 || isManagerMode) {
      setIsAvailable(null);
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
        // First check Cloud Firestore if configured
        if (isFirebaseConfigured) {
          const cloudP = await fetchCloudPlayerByName(trimmed);
          if (cloudP) {
            if (cloudP.hasLeft || cloudP.chips <= 0) {
              setIsAvailable(false);
              setErrorKey("register.sessionConcluded");
              setConcludedInfo({ chips: cloudP.chips, totalBets: cloudP.totalBets || 0 });
              setIsChecking(false);
              return;
            }
            if (currentUid && cloudP.uid === currentUid) {
              setIsAvailable(true);
              setExistingInfo({ chips: cloudP.chips, totalBets: cloudP.totalBets || 0 });
              setIsChecking(false);
              return;
            }
            setIsAvailable(false);
            setErrorKey("register.nameTaken");
            setIsChecking(false);
            return;
          }
        }

        const res = await fetch(
          `/api/players/check-name?name=${encodeURIComponent(trimmed)}&uid=${encodeURIComponent(currentUid)}`
        );
        const ct = res.headers.get("content-type") || "";
        if (!res.ok || !ct.includes("application/json")) {
          setIsAvailable(true);
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
        setIsAvailable(true);
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, [name, currentUid, isManagerMode]);

  if (!isOpen) return null;

  const switchToManager = () => {
    setIsManagerMode(true);
    setName("manager");
    setPassword("");
    setErrorKey(null);
    setCustomError(null);
  };

  const switchToParticipant = () => {
    setIsManagerMode(false);
    if (name.toLowerCase() === "manager") {
      setName(currentName && currentName.toLowerCase() !== "manager" ? currentName : "");
    }
    setPassword("");
    setErrorKey(null);
    setCustomError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorKey(null);
    setCustomError(null);

    try {
      // Manager authentication flow
      if (isManagerMode) {
        const inputPass = password.trim();
        if (!inputPass) {
          setCustomError(language === "zh" ? "请输入管理员密码" : "Please enter the manager password");
          setIsSubmitting(false);
          return;
        }

        try {
          const res = await fetch("/api/manager/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: "manager",
              password: inputPass,
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
          // Server offline fallback
        }

        // Standalone / offline fallback check
        if (inputPass === "123456") {
          onSuccess({
            uid: "manager_root",
            name: "manager",
            email: "manager@vantage.admin",
            chips: 10000,
            isManager: true,
          });
        } else {
          setErrorKey("manager.wrongPassword");
          setCustomError(null);
        }
        return;
      }

      // Regular Participant flow
      const trimmed = name.trim();
      if (!trimmed || trimmed.length < 2) {
        setErrorKey("register.nameTooShort");
        setCustomError(null);
        return;
      }

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
            if (data.error === "SESSION_CONCLUDED" || data.reasonKey === "register.sessionConcluded") {
              setErrorKey("register.sessionConcluded");
            } else {
              setErrorKey(data.reasonKey || "register.nameTaken");
            }
            setCustomError(null);
            setIsAvailable(false);
          } else {
            if (isFirebaseConfigured) {
              await savePlayerToCloud(data.player);
            }
            onSuccess(data.player);
          }
          return;
        }
      } catch {
        // Fallback for offline / static preview
      }

      // Cloud Firestore direct fallback if server endpoint is unreachable
      if (isFirebaseConfigured) {
        const cloudP = await fetchCloudPlayerByName(trimmed);
        if (cloudP) {
          if (cloudP.hasLeft || cloudP.chips <= 0) {
            setErrorKey("register.sessionConcluded");
            setCustomError(null);
            return;
          }
          await savePlayerToCloud(cloudP);
          onSuccess({
            ...cloudP,
            email: cloudP.email || `${cloudP.name}@study.subject`,
          });
          return;
        }
      }

      // Fallback for static hosting
      const localStoreKey = "vantage_static_players";
      const rawPlayers = localStorage.getItem(localStoreKey);
      const staticPlayers: Record<string, any> = rawPlayers ? JSON.parse(rawPlayers) : {};

      const existingUid = Object.keys(staticPlayers).find(
        (id) => staticPlayers[id]?.name?.trim().toLowerCase() === trimmed.toLowerCase()
      );

      if (existingUid) {
        const existing = staticPlayers[existingUid];
        if (existing.hasLeft || existing.chips <= 0) {
          setErrorKey("register.sessionConcluded");
          setCustomError(null);
          return;
        }
        if (isFirebaseConfigured) {
          await savePlayerToCloud(existing);
        }
        onSuccess(existing);
      } else {
        const conds = [0, 5, 10, 15];
        const assignedX = isFirebaseConfigured
          ? await getBalancedNextConditionX()
          : conds[Object.keys(staticPlayers).length % conds.length];
        const newPlayer = {
          uid: currentUid || "sub_" + Math.random().toString(36).substring(2, 9),
          name: trimmed,
          email: `${trimmed}@study.subject`,
          chips: 1000,
          isManager: false,
          registeredAt: new Date().toISOString(),
          lastActive: new Date().toISOString(),
          totalBets: 0,
          assignedX,
        };
        staticPlayers[newPlayer.uid] = newPlayer;
        localStorage.setItem(localStoreKey, JSON.stringify(staticPlayers));
        if (isFirebaseConfigured) {
          await savePlayerToCloud(newPlayer);
        }
        onSuccess(newPlayer);
      }
    } catch {
      setErrorKey("register.networkError");
      setCustomError(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = errorKey ? t(errorKey) : customError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden">
        {/* Top Header & Language Toggle */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shadow-md",
              isManagerMode ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
            )}>
              {isManagerMode ? "M" : "V"}
            </div>
            <span className="text-xs font-black tracking-wider text-slate-300 uppercase">
              {isManagerMode ? (language === "zh" ? "研究控制台" : "Research Console") : (language === "zh" ? "参试者入口" : "Study Simulator")}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
          </div>
        </div>

        {/* Mode Selector Tabs: Participant vs Manager */}
        <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-800 mb-6">
          <button
            type="button"
            onClick={switchToParticipant}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
              !isManagerMode
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/50"
                : "text-slate-400 hover:text-white"
            )}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{language === "zh" ? "参试者登录" : "Participant Login"}</span>
          </button>
          <button
            type="button"
            onClick={switchToManager}
            className={cn(
              "flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all",
              isManagerMode
                ? "bg-blue-600 text-white shadow-md shadow-blue-950/50"
                : "text-slate-400 hover:text-white"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{language === "zh" ? "管理员入口" : "Manager Login"}</span>
          </button>
        </div>

        {/* Title and Description */}
        <div className="space-y-1.5 mb-6">
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
          {/* Participant Name Input */}
          {!isManagerMode && (
            <div>
              <label className="block text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-2">
                {t("register.inputLabel")}
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("register.placeholder")}
                  maxLength={32}
                  className="w-full bg-slate-950/80 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-4 py-3.5 text-sm text-white font-medium placeholder:text-slate-600 outline-none transition-all pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {isChecking && <RotateCw className="w-4 h-4 animate-spin text-amber-400" />}
                  {!isChecking && isAvailable === true && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {!isChecking && isAvailable === false && (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                </div>
              </div>

              {/* Validation feedback for participant */}
              {isAvailable === true && !displayError && (
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
          )}

          {/* Manager Password Input - Secret, code is never displayed */}
          {isManagerMode && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-[11px] uppercase font-bold text-blue-400 tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>{t("manager.passwordLabel")}</span>
              </label>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("manager.passwordPlaceholder")}
                className="w-full bg-slate-950/80 border border-blue-500/50 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 rounded-xl px-4 py-3.5 text-sm text-white font-mono placeholder:text-slate-600 outline-none transition-all"
              />
              <p className="text-[11px] text-blue-300/80 leading-tight">
                {t("manager.testModeNotice")}
              </p>
            </div>
          )}

          {/* Errors */}
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

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={
                isSubmitting ||
                isChecking ||
                (isManagerMode && !password.trim()) ||
                (!isManagerMode && (!name.trim() || isAvailable === false))
              }
              className={cn(
                "w-full py-3.5 px-6 rounded-xl text-white font-bold uppercase tracking-wider text-xs transition-all shadow-lg flex items-center justify-center gap-2",
                isManagerMode
                  ? "bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-blue-950/40"
                  : "bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-emerald-950/40"
              )}
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

          {/* Bottom Switch Links */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
            {isManagerMode ? (
              <button
                type="button"
                onClick={switchToParticipant}
                className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1 font-medium"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>{language === "zh" ? "返回参试者登录" : "Back to Participant Login"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={switchToManager}
                className="text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1 font-medium"
              >
                <ShieldCheck className="w-3 h-3 text-blue-400" />
                <span>{t("manager.switchToManager")}</span>
              </button>
            )}

            <span className="text-slate-600 font-mono text-[10px]">
              {isManagerMode ? "ADMIN" : "STUDY"} v1.2
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, signIn, signOut, ensurePlayer, updateChips, recordBet, recordGameResult, PlayerData, isFirebaseConfigured } from "./lib/firebase";
import { getSocket, emitBet, emitGameResult, emitPlayerUpdate } from "./lib/realtime";
import { INITIAL_CHIPS, WHEEL_SLOTS, BET_PAYOUTS, RED_NUMBERS, BLACK_NUMBERS } from "./constants";
import { Bet, BetType, GameState, RouletteSlot, AppConfig, LeaderboardPlayer } from "./types";
import RouletteWheel from "./components/RouletteWheel";
import RouletteBoard from "./components/RouletteBoard";
import ManagerDashboard from "./components/ManagerDashboard";
import LeaderboardTop5 from "./components/LeaderboardTop5";
import LanguageToggle from "./components/LanguageToggle";
import ParticipantModal from "./components/ParticipantModal";
import { useLanguage } from "./lib/i18n";
import { Coins, LogOut, History, Info, BarChart3, RotateCw, AlertTriangle, UserCheck, ShieldCheck, FlaskConical, X, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "./lib/utils";

export default function App() {
  const { t, translateBetValue } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [view, setView] = useState<"game" | "manager">("game");
  const [onlineCount, setOnlineCount] = useState(1);
  const [globalBets, setGlobalBets] = useState<any[]>([]);
  const [globalHistory, setGlobalHistory] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardPlayer[]>([]);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState<boolean>(false);
  const [showRules, setShowRules] = useState<boolean>(false);

  // Simulation / Game state
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem("vantage_roulette_state");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          balance: parsed.balance ?? INITIAL_CHIPS,
          isSpinning: false,
          lastResult: null,
          history: parsed.history || [],
          pendingBets: [],
        };
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    return {
      balance: INITIAL_CHIPS,
      isSpinning: false,
      lastResult: null,
      history: [],
      pendingBets: [],
    };
  });

  const [winningIndex, setWinningIndex] = useState<number | null>(null);
  const [selectedChip, setSelectedChip] = useState<number>(10);

  // Fair rounds parameter X in [0, 5, 10, 15] (default: 10 optimal)
  const [fairRoundsX, setFairRoundsX] = useState<number>(() => {
    const saved = localStorage.getItem("vantage_fair_x");
    if (saved !== null) {
      const parsed = parseInt(saved, 10);
      if ([0, 5, 10, 15].includes(parsed)) return parsed;
    }
    return 10;
  });

  const [participantTrials, setParticipantTrials] = useState<number>(0);

  // Participant identification states (Unique name per participant; Manager ID: "manager" / PW: "123456")
  const [showParticipantModal, setShowParticipantModal] = useState<boolean>(false);
  const [participantName, setParticipantName] = useState<string>(() => {
    return localStorage.getItem("vantage_participant_name") || "";
  });
  const [participantUid, setParticipantUid] = useState<string>(() => {
    return localStorage.getItem("vantage_participant_uid") || "";
  });

  const isManager = Boolean(
    player?.isManager ||
    participantName.trim().toLowerCase() === "manager"
  );

  // Verify and ensure unique participant identification on startup
  useEffect(() => {
    const storedName = localStorage.getItem("vantage_participant_name");
    const storedUid = localStorage.getItem("vantage_participant_uid");

    if (!storedName) {
      // Must name themselves first before starting
      setShowParticipantModal(true);
    } else {
      const isStoredManager = storedName.trim().toLowerCase() === "manager";
      if (isStoredManager) {
        // Manager requires re-verifying password if not already validated
        setShowParticipantModal(true);
      } else {
        // Verify and sync participant session with server on startup/reload
        fetch("/api/players/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: storedName, uid: storedUid }),
        })
          .then((r) => {
            const ct = r.headers.get("content-type") || "";
            return r.ok && ct.includes("application/json") ? r.json() : null;
          })
          .then((res) => {
            if (!res) return;
            if (
              res.success &&
              res.player &&
              !res.player.hasLeft &&
              (res.player.chips > 0 || res.player.isManager)
            ) {
              setPlayer(res.player);
              setParticipantName(res.player.name);
              setParticipantUid(res.player.uid);
              if (typeof res.player.assignedX === "number") {
                setFairRoundsX(res.player.assignedX);
                localStorage.setItem("vantage_fair_x", String(res.player.assignedX));
              }
              setGameState((prev) => ({
                ...prev,
                balance: res.player.chips ?? prev.balance,
              }));
              setParticipantTrials(res.player.totalBets || 0);
              setShowParticipantModal(false);
              emitPlayerUpdate(res.player);
            } else {
              // Session is permanently concluded or chips depleted: clear credentials so participant cannot continue
              localStorage.removeItem("vantage_participant_name");
              localStorage.removeItem("vantage_participant_uid");
              setParticipantName("");
              setParticipantUid("");
              setPlayer(null);
              setShowParticipantModal(true);
            }
          })
          .catch(() => {
            setShowParticipantModal(true);
          });
      }
    }
  }, []);

  const handleParticipantRegistered = (p: any) => {
    localStorage.setItem("vantage_participant_name", p.name);
    localStorage.setItem("vantage_participant_uid", p.uid);
    setParticipantName(p.name);
    setParticipantUid(p.uid);

    const isManagerUser = Boolean(p.isManager || p.name.trim().toLowerCase() === "manager");

    const fullPlayer: PlayerData = {
      uid: p.uid,
      name: p.name,
      email: p.email || (isManagerUser ? "manager@vantage.admin" : `${p.name}@study.subject`),
      chips: p.chips ?? gameState.balance,
      isManager: isManagerUser,
      lastActive: new Date().toISOString(),
      assignedX: typeof p.assignedX === "number" ? p.assignedX : undefined,
    };
    if (typeof p.assignedX === "number") {
      setFairRoundsX(p.assignedX);
      localStorage.setItem("vantage_fair_x", String(p.assignedX));
    }
    setPlayer(fullPlayer);
    setGameState((prev) => ({ ...prev, balance: p.chips ?? prev.balance }));
    setParticipantTrials(p.totalBets || 0);
    setShowParticipantModal(false);
    emitPlayerUpdate(fullPlayer);

    // If manager logs in, open game view directly so they can test
    if (isManagerUser) {
      setView("game");
    }
  };

  // Save to localStorage if not using Firebase
  useEffect(() => {
    if (!isFirebaseConfigured) {
      localStorage.setItem(
        "vantage_roulette_state",
        JSON.stringify({
          balance: gameState.balance,
          history: gameState.history,
        })
      );
    }
  }, [gameState.balance, gameState.history]);

  // Load config, auth & Shared State
  useEffect(() => {
    fetch("/api/config")
      .then((res) => {
        const ct = res.headers.get("content-type") || "";
        return res.ok && ct.includes("application/json") ? res.json() : null;
      })
      .then((data) => {
        if (data) setConfig(data);
      })
      .catch(() => {});

    fetch("/api/state")
      .then((res) => {
        const ct = res.headers.get("content-type") || "";
        return res.ok && ct.includes("application/json") ? res.json() : null;
      })
      .then((data) => {
        if (!data) return;
        if (data.history) setGlobalHistory(data.history);
        if (data.recentBets) setGlobalBets(data.recentBets);
        if (data.onlineCount) setOnlineCount(data.onlineCount);
        if (data.leaderboard && Array.isArray(data.leaderboard)) {
          setLeaderboard(data.leaderboard);
        }
      })
      .catch(() => {});

    fetch("/api/leaderboard/top5")
      .then((res) => {
        const ct = res.headers.get("content-type") || "";
        return res.ok && ct.includes("application/json") ? res.json() : null;
      })
      .then((data) => {
        if (Array.isArray(data)) setLeaderboard(data);
      })
      .catch(() => {});

    // Listen to Realtime Events via Socket.IO
    const socket = getSocket();

    socket.on("status_update", (data) => {
      setOnlineCount(data.onlineCount);
    });

    socket.on("new_game_result", (result) => {
      setGlobalHistory((prev) => [result, ...prev].slice(0, 50));
    });

    socket.on("new_bet", (bet) => {
      setGlobalBets((prev) => [bet, ...prev].slice(0, 25));
    });

    socket.on("leaderboard_update", (top5: LeaderboardPlayer[]) => {
      if (Array.isArray(top5)) {
        setLeaderboard(top5);
      }
    });

    socket.on("players_refresh", (players: any[]) => {
      // If current player updated remotely, refresh chips
      if (player) {
        const found = players.find((p) => p.uid === player.uid);
        if (found && found.chips !== gameState.balance) {
          setGameState((prev) => ({ ...prev, balance: found.chips }));
        }
      }
    });

    return () => {
      socket.off("status_update");
      socket.off("new_game_result");
      socket.off("new_bet");
      socket.off("leaderboard_update");
      socket.off("players_refresh");
    };
  }, [player, gameState.balance]);

  // Firebase Auth sync
  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const pData = await ensurePlayer(currentUser, config?.managerEmail || null);
        if (pData) {
          setPlayer(pData);
          setGameState((prev) => ({ ...prev, balance: pData.chips }));
          emitPlayerUpdate(pData);
        }
      } else {
        setPlayer(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const placeBet = (type: BetType, value: string, customAmount?: number) => {
    if (gameState.isSpinning) return;

    // Must name themselves first
    if (!participantName || !player?.name) {
      setShowParticipantModal(true);
      return;
    }

    // Study restriction: only Red and Black are open
    if (value !== "Red" && value !== "Black") return;

    const betAmount = customAmount || selectedChip || 10;
    if (gameState.balance < betAmount) return;

    const isTestBet = isManager;

    setGameState((prev) => {
      const existing = prev.pendingBets.find((b) => b.value.toLowerCase() === value.toLowerCase());
      let newBets: Bet[];
      if (existing) {
        newBets = prev.pendingBets.map((b) =>
          b.value.toLowerCase() === value.toLowerCase() ? { ...b, amount: b.amount + betAmount } : b
        );
      } else {
        newBets = [
          ...prev.pendingBets,
          {
            id: Math.random().toString(36).slice(2, 10),
            type,
            value,
            amount: betAmount,
            chipColor: value === "Red" ? "bg-red-500 text-white" : "bg-slate-900 border border-slate-600 text-white",
            isTest: isTestBet,
          },
        ];
      }

      // Emit bet for global visibility
      emitBet({
        playerUid: player?.uid || participantUid,
        playerName: player?.name || participantName,
        playerEmail: player?.email || (isTestBet ? "manager@vantage.admin" : `${participantName}@study.subject`),
        amount: betAmount,
        type,
        value,
        isTest: isTestBet,
        timestamp: new Date().toISOString(),
      });

      return {
        ...prev,
        balance: prev.balance - betAmount,
        pendingBets: newBets,
      };
    });
  };

  const handleSpin = () => {
    if (gameState.isSpinning || gameState.pendingBets.length === 0) return;
    if (!participantName || !player?.name) {
      setShowParticipantModal(true);
      return;
    }

    // Check if within initial X fair rounds (50% winning chance)
    const isWithinFairWindow = !isManager && participantTrials < fairRoundsX;
    let index: number;

    if (isWithinFairWindow) {
      // 50% Fair probability: select strictly among the 36 Red and Black slots (0 and 00 excluded, exactly 50/50)
      const fairSlots = WHEEL_SLOTS.filter((s) => s.color === "red" || s.color === "black");
      const chosen = fairSlots[Math.floor(Math.random() * fairSlots.length)];
      index = chosen.index;
    } else {
      // Full American Roulette: 38 slots including 0 and 00 (house edge / unfair active)
      index = Math.floor(Math.random() * WHEEL_SLOTS.length);
    }

    setWinningIndex(index);
    setGameState((prev) => ({ ...prev, isSpinning: true }));
  };

  const handleSpinComplete = useCallback(() => {
    if (winningIndex === null) return;

    const result = WHEEL_SLOTS[winningIndex];
    const winningNum = result.number;
    const winningColor = result.color;

    // Calculate payouts
    let totalPayout = 0;
    const processedBets = gameState.pendingBets.map((bet) => {
      let isWin = false;
      let multiplier = 1;

      if (bet.value === "Red" && winningColor === "red") {
        isWin = true;
        multiplier = 1; // 1:1 payout
      } else if (bet.value === "Black" && winningColor === "black") {
        isWin = true;
        multiplier = 1; // 1:1 payout
      } else if (bet.value === "Green" && winningColor === "green") {
        isWin = true;
        multiplier = 17; // 17:1 payout for green zeros
      } else {
        multiplier = BET_PAYOUTS[bet.type] || 1;
      }

      const payout = isWin ? bet.amount * (multiplier + 1) : 0;
      totalPayout += payout;

      // Persistence: Record bet in Firebase if configured
      if (isFirebaseConfigured && user) {
        recordBet({
          playerId: user.uid,
          playerEmail: user.email,
          betType: bet.type,
          betValue: bet.value,
          amount: bet.amount,
          payout,
          status: isWin ? "won" : "lost",
        });
      }

      return { ...bet, status: isWin ? "won" : "lost", payout };
    });

    const newBalance = gameState.balance + totalPayout;
    const isTestRun = isManager;

    // Calculate current streak length S and directional counter-betting
    let currentStreak = 1;
    let lastColor: string | null = null;
    if (gameState.history.length > 0) {
      lastColor = gameState.history[0].color;
      for (let i = 1; i < gameState.history.length; i++) {
        if (gameState.history[i].color === lastColor) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    const totalWageredOnSpin = gameState.pendingBets.reduce((sum, b) => sum + b.amount, 0);
    const bankrollBeforeSpin = gameState.balance + totalWageredOnSpin;

    // Study Data Recording: Record every trial to server storage
    // Flag manager testing wagers so they DO NOT effect or contaminate the study data
    processedBets.forEach((bet) => {
      const isCounterStreak = lastColor
        ? (lastColor === "black" && bet.value.toLowerCase() === "red") ||
          (lastColor === "red" && bet.value.toLowerCase() === "black")
        : false;
      const wagerProportion =
        bankrollBeforeSpin > 0 ? Number((bet.amount / bankrollBeforeSpin).toFixed(3)) : 0.1;

      fetch("/api/bets/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerUid: player?.uid || participantUid || (isTestRun ? "manager_root" : "sub_participant"),
          playerName: player?.name || participantName || (isTestRun ? "manager" : "Anonymous Participant"),
          playerEmail: player?.email || (isTestRun ? "manager@vantage.admin" : `${participantName}@study.subject`),
          amount: bet.amount,
          type: bet.type,
          value: bet.value,
          winningNumber: winningNum,
          winningColor: winningColor,
          payout: bet.payout,
          status: bet.status,
          balanceAfter: newBalance,
          paramX: !isTestRun && typeof player?.assignedX === "number" ? player.assignedX : fairRoundsX,
          streakLength: currentStreak,
          counterStreakBet: isCounterStreak,
          wagerProportion,
          isTest: isTestRun,
          timestamp: new Date().toISOString(),
        }),
      }).catch((err) => console.error("Error recording trial:", err));
    });

    // Record game result for history
    if (isFirebaseConfigured && user) {
      recordGameResult({
        winningNumber: result.number,
        winningColor: result.color,
      });
    }

    emitGameResult({
      winningNumber: result.number,
      winningColor: result.color,
      timestamp: new Date().toISOString(),
    });

    // Sync player chips back to database
    if (isFirebaseConfigured && user) {
      updateChips(user.uid, newBalance);
    }

    if (player) {
      const updatedPlayer = { ...player, chips: newBalance };
      setPlayer(updatedPlayer);
      emitPlayerUpdate(updatedPlayer);
    }

    // If player reaches 0 chips, automatically record bankruptcy and conclude session
    if (newBalance <= 0 && !isManager && participantUid) {
      fetch("/api/players/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: participantUid,
          finalPt: 0,
          reason: "bankrupt",
        }),
      }).catch((err) => console.error("Error reporting bankruptcy to server:", err));
    }

    // Update local state
    setGameState((prev) => ({
      ...prev,
      balance: newBalance,
      isSpinning: false,
      lastResult: result,
      history: [result, ...prev.history].slice(0, 10),
      pendingBets: [],
    }));

    setParticipantTrials((prev) => prev + 1);
    setWinningIndex(null);
  }, [winningIndex, gameState.pendingBets, gameState.balance, user, player, participantName, participantUid, isManager]);

  const clearBets = () => {
    if (gameState.isSpinning) return;
    const refunded = gameState.pendingBets.reduce((acc, b) => acc + b.amount, 0);
    setGameState((prev) => ({
      ...prev,
      balance: prev.balance + refunded,
      pendingBets: [],
    }));
  };

  const [showLeaveConfirmModal, setShowLeaveConfirmModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("vantage_participant_name");
    localStorage.removeItem("vantage_participant_uid");
    setParticipantName("");
    setParticipantUid("");
    setPlayer(null);
    setView("game");
    setShowParticipantModal(true);
    if (isFirebaseConfigured) {
      signOut();
    }
  };

  const handleInitiateLeave = () => {
    if (isManager) {
      handleLogout();
      return;
    }
    setShowLeaveConfirmModal(true);
  };

  const handleConfirmLeave = async () => {
    if (participantUid && !isManager) {
      try {
        await fetch("/api/players/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: participantUid,
            finalPt: gameState.balance,
            reason: gameState.balance <= 0 ? "bankrupt" : "voluntarily_left",
          }),
        });
      } catch (e) {
        console.error("Error reporting leave:", e);
      }
    }
    setShowLeaveConfirmModal(false);
    handleLogout();
  };

  const handleGameOverLeave = async () => {
    if (participantUid && !isManager) {
      try {
        await fetch("/api/players/leave", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: participantUid,
            finalPt: 0,
            reason: "bankrupt",
          }),
        });
      } catch (e) {
        console.error("Error reporting bankrupt game over:", e);
      }
    }
    handleLogout();
  };

  const isGameOver =
    !isManager &&
    Boolean(participantName) &&
    gameState.balance <= 0 &&
    gameState.pendingBets.length === 0 &&
    !gameState.isSpinning;

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-slate-100 font-sans select-none overflow-hidden">
      {/* Participant Registration / Manager Login Modal */}
      <ParticipantModal
        isOpen={showParticipantModal}
        currentName={participantName}
        currentUid={participantUid}
        canClose={Boolean(participantName)}
        onClose={() => setShowParticipantModal(false)}
        onSuccess={handleParticipantRegistered}
      />

      {/* Standalone Top 5 Ranking Modal (Accessible to all players) */}
      <AnimatePresence>
        {showLeaderboardModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <span>{t("leaderboard.title")}</span>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 py-0.2 rounded font-mono font-bold">
                        TOP 5
                      </span>
                    </h3>
                    <span className="text-[10px] text-slate-400 block">
                      {t("leaderboard.subtitle")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setShowLeaderboardModal(false)}
                  className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 flex-1 overflow-y-auto">
                <LeaderboardTop5
                  leaderboard={leaderboard}
                  currentUid={participantUid}
                  currentName={participantName}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Game Over Modal (All points lost / session complete) */}
      {isGameOver && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-red-950/70 border border-red-700/60 text-red-400 flex items-center justify-center mx-auto text-2xl font-bold">
              🏁
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">
                {t("gameover.title")}
              </h2>
              <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                {t("gameover.desc")}
              </p>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left space-y-1.5 text-xs text-slate-300 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">{t("gameover.participantId")}:</span>
                <span className="text-white font-bold">{participantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("gameover.roundsPlayed")}:</span>
                <span className="text-emerald-400 font-bold">{participantTrials}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t("gameover.endingBalance")}:</span>
                <span className="text-red-400 font-bold">0 PT</span>
              </div>
            </div>

            {/* Top 5 Leaderboard Standings in Game Over */}
            <div className="pt-2 border-t border-slate-800 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-amber-300 tracking-wider flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  {t("leaderboard.title")}
                </span>
                <span className="text-[9px] font-mono text-slate-400">
                  {t("leaderboard.subtitle")}
                </span>
              </div>
              <div className="max-h-48 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">
                <LeaderboardTop5
                  leaderboard={leaderboard}
                  currentUid={participantUid}
                  currentName={participantName}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              {t("gameover.thankyou")}
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleGameOverLeave}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
              >
                {t("gameover.leaveBtn")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voluntary Leave Game Confirmation Modal */}
      {showLeaveConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-6 relative overflow-hidden space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  {t("app.confirmLeaveTitle")}
                </h3>
                <span className="text-[10px] text-amber-400 font-mono">
                  {participantName} · {gameState.balance} PT
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {t("app.confirmLeaveDesc")}
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLeaveConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors border border-slate-700"
              >
                {t("app.confirmLeaveCancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-red-950/50"
              >
                {t("app.confirmLeaveConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 sm:h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 sm:px-5 shrink-0 z-50 overflow-x-clip">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-600 rounded-xl flex items-center justify-center font-bold text-base sm:text-xl shadow-lg shadow-emerald-900/30 shrink-0">
            V
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-base md:text-lg font-sans font-extrabold leading-tight tracking-tight uppercase italic truncate">
              {t("app.title")}
            </h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shrink-0" />
              <span className="text-[8px] sm:text-[9px] font-black text-emerald-500 uppercase tracking-widest truncate">
                {t("app.activeSessions", { count: onlineCount })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Real-time Units Balance Pill - Only visible when participant is registered/logged in, not on login interface */}
          {Boolean(participantName) && !showParticipantModal && (
            <div className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 shadow-sm font-mono font-bold text-xs sm:text-sm shrink-0">
              <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{gameState.balance.toLocaleString()}</span>
              <span className="text-[9px] sm:text-[10px] text-emerald-400/80 font-normal">PT</span>
            </div>
          )}

          <LanguageToggle className="shrink-0" />

          {/* Manager Badge or Participant Badge */}
          {isManager ? (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-blue-950/80 border border-blue-500/50 shadow-sm shrink-0">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <div className="text-left hidden sm:block">
                <span className="text-[8px] text-blue-300 font-bold uppercase tracking-wider block leading-none">
                  Manager
                </span>
                <span className="text-[9px] font-mono text-blue-200">
                  {t("manager.testModeBadge")}
                </span>
              </div>
            </div>
          ) : participantName ? (
            <button
              onClick={() => setShowParticipantModal(true)}
              className="flex items-center gap-1 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-xl bg-slate-850 border border-slate-750 hover:border-emerald-500/60 transition-all text-xs group shrink-0"
              title={t("register.changeParticipant")}
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
              <div className="text-left max-w-[45px] xs:max-w-[70px] sm:max-w-[120px] truncate">
                <span className="text-[8px] text-slate-400 uppercase font-bold tracking-wider block leading-none hidden sm:block">
                  {t("register.currentParticipant")}
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors truncate block">
                  {participantName}
                </span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowParticipantModal(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-amber-950/40 animate-pulse shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{t("register.title")}</span>
              <span className="sm:hidden">Name</span>
            </button>
          )}

          {/* Manager Console Toggle (Only shown for Manager) */}
          {isManager && (
            <button
              onClick={() => setView(view === "manager" ? "game" : "manager")}
              className={cn(
                "px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all uppercase tracking-tight flex items-center gap-1 shadow-md shrink-0",
                view === "manager"
                  ? "bg-blue-600 text-white shadow-blue-900/40"
                  : "bg-slate-800 hover:bg-slate-750 text-blue-300 border border-blue-500/40"
              )}
            >
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{view === "manager" ? t("manager.backToTest") : t("app.managerConsole")}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex relative overflow-hidden">
        {/* Left / Center Pane: Roulette Game Simulation */}
        <div
          className={cn(
            "flex-1 relative bg-emerald-950/5 flex flex-col items-center p-2 sm:p-5 transition-all duration-500 overflow-y-auto",
            view === "manager" ? "lg:mr-[450px]" : ""
          )}
        >
          {/* Manager Test Mode Banner */}
          {isManager && (
            <div className="w-full max-w-5xl mb-3 sm:mb-4 bg-gradient-to-r from-blue-950/90 via-slate-900 to-blue-950/90 border border-blue-500/40 rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 font-bold shrink-0">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      {t("manager.testModeBadge")} (ID: manager)
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-300 text-[8px] font-mono font-bold uppercase tracking-widest border border-blue-400/30">
                      Isolated Testing
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-blue-200/90 font-medium leading-tight mt-0.5">
                    {t("manager.testModeNotice")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setView(view === "manager" ? "game" : "manager")}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 shrink-0"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {view === "manager" ? t("manager.backToTest") : t("manager.organizedDataTitle")}
              </button>
            </div>
          )}

          {/* Instructions Protocol Top Bar */}
          <div className="w-full max-w-5xl mb-2 sm:mb-4">
            {/* Protocol */}
            <div className="bg-slate-900/90 border border-slate-700/80 p-2 sm:p-3 rounded-xl shadow-md backdrop-blur-md">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowRules(!showRules)}
                  className="flex items-center gap-1.5 text-[10px] sm:text-xs font-black text-emerald-400 uppercase tracking-wider hover:text-emerald-300 cursor-pointer min-h-[36px]"
                >
                  <Info className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{t("protocol.title")}</span>
                  <span className="text-[9px] text-slate-400 font-mono font-normal ml-0.5">
                    {showRules ? t("protocol.hide") : t("protocol.tapToView")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={handleInitiateLeave}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/90 hover:bg-rose-900 text-rose-200 hover:text-white border border-rose-600/70 text-xs font-bold transition-all shadow-md active:scale-95 touch-manipulation min-h-[38px] shrink-0"
                  title={t("app.leaveAnytimeTooltip")}
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>{t("app.leaveAnytime")}</span>
                </button>
              </div>
              {showRules && (
                <ul className="text-[10px] text-slate-300 space-y-1 font-medium mt-2 pt-2 border-t border-slate-800">
                  <li className="flex gap-1.5">
                    <span className="text-emerald-500 font-mono font-bold">01.</span> {t("protocol.step1")}
                  </li>
                  <li className="flex gap-1.5">
                    <span className="text-emerald-500 font-mono font-bold">02.</span> {t("protocol.step2")}
                  </li>
                  <li className="flex gap-1.5">
                    <span className="text-emerald-500 font-mono font-bold">03.</span> {t("protocol.step3")}
                  </li>
                  <li className="flex gap-1.5">
                    <span className="text-emerald-500 font-mono font-bold">04.</span> {t("protocol.step4")}
                  </li>
                </ul>
              )}
            </div>
          </div>

          {/* Interactive Simulation Arena */}
          <div className="w-full max-w-5xl mx-auto space-y-3 sm:space-y-5">
            {/* Top Section: Roulette Wheel Stage on Left, Top 5 Ranking List directly on the Right with Reduced Width */}
            <div className="flex flex-row gap-2 sm:gap-4 items-stretch w-full">
              {/* Left: Roulette Wheel Stage */}
              <div className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl p-2 sm:p-4 flex flex-col items-center justify-between shadow-xl relative min-w-0">
                <RouletteWheel
                  isSpinning={gameState.isSpinning}
                  winningIndex={winningIndex}
                  onSpinComplete={handleSpinComplete}
                />

                {/* Spin Action CTA */}
                <div className="w-full mt-2 sm:mt-3 flex items-center justify-center pt-2 border-t border-slate-800/80">
                  <button
                    onClick={handleSpin}
                    disabled={gameState.isSpinning || gameState.pendingBets.length === 0}
                    className="w-full py-2.5 px-3 sm:px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-35 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2 min-h-[44px] active:scale-95 touch-manipulation"
                  >
                    {gameState.isSpinning ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span className="truncate">{t("probe.spinning")}</span>
                      </>
                    ) : (
                      <span className="truncate">{t("probe.spin")}</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Right: Top 3 Ranking List - Placed directly on the right of the roulette wheel with compact width */}
              <div
                id="leaderboard-ranking-panel"
                className="w-[105px] xs:w-[118px] sm:w-[165px] md:w-[195px] shrink-0 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col shadow-xl overflow-hidden"
              >
                <LeaderboardTop5
                  leaderboard={leaderboard}
                  currentUid={participantUid}
                  currentName={participantName}
                  className="h-full"
                />
              </div>
            </div>

            {/* Bottom Section: Betting Board */}
            <div className="w-full flex justify-center">
              <div className="w-full">
                <RouletteBoard
                  onPlaceBet={placeBet}
                  bets={gameState.pendingBets.map((b) => ({ value: b.value, amount: b.amount }))}
                  selectedChip={selectedChip}
                  onSelectChip={setSelectedChip}
                  disabled={gameState.isSpinning}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Drawer: Manager Organized Study Data & Analytics */}
        {isManager && (
          <aside
            className={cn(
              "fixed inset-y-16 right-0 w-full sm:w-[680px] md:w-[780px] lg:w-[880px] xl:w-[980px] z-40 transform transition-transform duration-300 ease-in-out border-l border-slate-800 bg-slate-900 shadow-2xl",
              view === "manager" ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="h-full flex flex-col relative">
              <button
                onClick={() => setView("game")}
                className="absolute top-4 right-4 z-50 p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 shadow-sm transition-all"
                title="Close Manager Console"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex-1 overflow-hidden">
                <ManagerDashboard />
              </div>
            </div>
          </aside>
        )}
      </main>

      {/* Footer */}
      <footer className="h-9 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between shrink-0 z-50 text-[10px] text-slate-500">
        <div>
          {t("footer.sessionId", { id: participantUid ? participantUid.slice(0, 10) : "ANONYMOUS" })}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <span>{t("footer.systemStatus")}</span>
        </div>
        <div className="hidden sm:block">
          {t("footer.secureNotice")}
        </div>
      </footer>
    </div>
  );
}

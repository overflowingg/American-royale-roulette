import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import { computeResearchAnalytics } from "./src/lib/researchAnalytics";

dotenv.config();

const isProd = process.env.NODE_ENV === "production";
const PORT = 3000;

const MANAGER_ID = "manager";
const MANAGER_PASSWORD = "123456";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "study_store.json");

interface GameResult {
  winningNumber: string;
  winningColor: string;
  timestamp: string;
}

interface BetRecord {
  id: string;
  playerUid: string;
  playerName: string;
  playerEmail?: string;
  amount: number;
  type: string;
  value: string;
  winningNumber?: string;
  winningColor?: string;
  payout?: number;
  status?: "won" | "lost" | "pending";
  balanceAfter?: number;
  paramX?: number;
  streakLength?: number;
  counterStreakBet?: boolean;
  wagerProportion?: number;
  isTest?: boolean;
  timestamp: string;
}

interface Player {
  uid: string;
  name: string;
  email: string;
  chips: number;
  finalPt?: number; // Final PT balance recorded when concluding/leaving the game
  isManager: boolean;
  registeredAt: string;
  lastActive: string;
  totalBets: number;
  assignedX?: number; // Pre-heating fair rounds condition X assigned to participant (0, 5, 10, 15)
  hasLeft?: boolean;
  leftReason?: "bankrupt" | "voluntarily_left";
  leftAt?: string;
}

export const STUDY_X_CONDITIONS = [0, 5, 10, 15] as const;

// Helper to calculate balanced distribution so the number of players of each X is averaged
function getConditionXDistribution() {
  const participants = Object.values(store.players).filter(
    (p) => !p.isManager && p.uid !== "manager_root" && p.name.toLowerCase() !== MANAGER_ID
  );

  const counts: Record<number, number> = { 0: 0, 5: 0, 10: 0, 15: 0 };
  for (const p of participants) {
    if (typeof p.assignedX === "number" && STUDY_X_CONDITIONS.includes(p.assignedX as any)) {
      counts[p.assignedX] = (counts[p.assignedX] || 0) + 1;
    }
  }

  // Backfill any participants who do not have assignedX yet to maintain balance
  for (const p of participants) {
    if (typeof p.assignedX !== "number" || !STUDY_X_CONDITIONS.includes(p.assignedX as any)) {
      let minVal = Infinity;
      for (const x of STUDY_X_CONDITIONS) {
        if (counts[x] < minVal) minVal = counts[x];
      }
      const candidates = STUDY_X_CONDITIONS.filter((x) => counts[x] === minVal);
      p.assignedX = candidates[0];
      counts[p.assignedX] = (counts[p.assignedX] || 0) + 1;
    }
  }

  const total = participants.length;
  const average = total > 0 ? Number((total / STUDY_X_CONDITIONS.length).toFixed(2)) : 0;

  // Determine which condition is least-filled for next assignment
  let minCount = Infinity;
  for (const x of STUDY_X_CONDITIONS) {
    if (counts[x] < minCount) {
      minCount = counts[x];
    }
  }
  const leastFilled = STUDY_X_CONDITIONS.filter((x) => counts[x] === minCount);
  const nextAssigned = leastFilled[0];

  return {
    counts,
    total,
    average,
    nextAssigned,
    conditions: STUDY_X_CONDITIONS,
  };
}

function assignNextConditionX(): number {
  return getConditionXDistribution().nextAssigned;
}

interface StudyStore {
  players: Record<string, Player>;
  bets: BetRecord[];
  history: GameResult[];
}

// Initial state
let store: StudyStore = {
  players: {},
  bets: [],
  history: [],
};

// Ensure data folder and file persistence
function loadStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(raw);
      store = {
        players: parsed.players || {},
        bets: parsed.bets || [],
        history: parsed.history || [],
      };
      console.log(`[Storage] Loaded ${Object.keys(store.players).length} registered participants and ${store.bets.length} trials.`);
    } else {
      saveStore();
    }
  } catch (err) {
    console.error("[Storage] Error reading study store:", err);
  }
}

function saveStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage] Error saving study store:", err);
  }
}

loadStore();

let onlineCount = 0;

// Helper to compute TOP 3 leaderboard strictly based on the final PT players have (excluding manager)
function getTop3Leaderboard() {
  const allParticipants = Object.values(store.players).filter(
    (p) => p.uid !== "manager_root" && p.name.toLowerCase() !== MANAGER_ID && !p.isManager
  );

  // Prioritize participants who have actually played (totalBets > 0 or hasLeft)
  const playedParticipants = allParticipants.filter((p) => (p.totalBets || 0) > 0 || p.hasLeft);
  const pool = playedParticipants.length > 0 ? playedParticipants : allParticipants;

  return pool
    .sort((a, b) => {
      // TOP 3 strictly relies on the final PT the players have
      const finalPtA = typeof a.finalPt === "number" ? a.finalPt : (a.chips ?? 0);
      const finalPtB = typeof b.finalPt === "number" ? b.finalPt : (b.chips ?? 0);
      if (finalPtB !== finalPtA) {
        return finalPtB - finalPtA; // Descending by final PT
      }
      return (b.totalBets ?? 0) - (a.totalBets ?? 0);
    })
    .slice(0, 3)
    .map((p, idx) => {
      const finalPt = typeof p.finalPt === "number" ? p.finalPt : (p.chips ?? 0);
      return {
        rank: idx + 1,
        uid: p.uid,
        name: p.name,
        chips: finalPt,
        finalPt: finalPt,
        totalBets: p.totalBets || 0,
        assignedX: p.assignedX,
        hasLeft: Boolean(p.hasLeft),
        lastActive: p.lastActive,
      };
    });
}

const getTop5Leaderboard = getTop3Leaderboard;

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/config", (req, res) => {
    res.json({
      managerEmail: process.env.MANAGER_EMAIL || "manager@vantage.admin",
      managerId: MANAGER_ID,
    });
  });

  // Manager Authentication: ID="manager", Password="123456"
  app.post("/api/manager/login", (req, res) => {
    const { id, password } = req.body;
    const rawId = String(id || "").trim().toLowerCase();
    const rawPassword = String(password || "").trim();

    if (rawId === MANAGER_ID && rawPassword === MANAGER_PASSWORD) {
      const managerUid = "manager_root";
      const existing = store.players[managerUid];

      const managerPlayer: Player = {
        uid: managerUid,
        name: "manager",
        email: "manager@vantage.admin",
        chips: existing ? existing.chips : 10000,
        isManager: true,
        registeredAt: existing ? existing.registeredAt : new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalBets: existing ? existing.totalBets : 0,
      };

      store.players[managerUid] = managerPlayer;
      saveStore();

      io.emit("players_refresh", Object.values(store.players));

      return res.json({
        success: true,
        isManager: true,
        player: managerPlayer,
      });
    }

    return res.status(401).json({
      success: false,
      error: "INVALID_CREDENTIALS",
      message: "Invalid manager ID or password.",
    });
  });

  // Check if a name is already used (strictly unique rule for participants)
  app.get("/api/players/check-name", (req, res) => {
    const rawName = String(req.query.name || "").trim();
    const currentUid = String(req.query.uid || "").trim();

    if (!rawName) {
      return res.json({ available: false, reason: "Name cannot be empty." });
    }

    const normalized = rawName.toLowerCase();

    // If typing "manager", notify that manager password is required
    if (normalized === MANAGER_ID) {
      return res.json({
        available: true,
        isManagerId: true,
        requiresPassword: true,
        reason: "Manager ID detected. Password required.",
      });
    }

    const existing = Object.values(store.players).find(
      (p) => p.name.trim().toLowerCase() === normalized && p.uid !== "manager_root"
    );

    if (existing) {
      const isConcluded = Boolean(existing.hasLeft || (existing.chips <= 0 && !existing.isManager));
      if (isConcluded) {
        return res.json({
          available: false,
          isConcluded: true,
          reasonKey: "register.sessionConcluded",
          chips: typeof existing.finalPt === "number" ? existing.finalPt : existing.chips,
          finalPt: typeof existing.finalPt === "number" ? existing.finalPt : existing.chips,
          totalBets: existing.totalBets || 0,
          reason: "This participant has concluded their session and left the game. You cannot log in again.",
        });
      }

      // If active player has a current uid matching this player, allow resume before leaving
      if (currentUid && existing.uid === currentUid) {
        return res.json({
          available: true,
          isExistingPlayer: true,
          chips: existing.chips,
          finalPt: typeof existing.finalPt === "number" ? existing.finalPt : existing.chips,
          totalBets: existing.totalBets || 0,
          message: `Active player session found (${existing.chips} PT, ${existing.totalBets || 0} trials).`,
        });
      }

      return res.json({
        available: false,
        nameTaken: true,
        reasonKey: "register.nameTaken",
        reason: "This participant name is currently in use by an active session.",
      });
    }

    res.json({ available: true, isExistingPlayer: false });
  });

  // Dedicated endpoint to conclude session when a player leaves or loses all points
  app.post("/api/players/leave", (req, res) => {
    const { uid, reason, finalPt } = req.body;
    const rawUid = String(uid || "").trim();
    const player = store.players[rawUid];

    if (player && !player.isManager) {
      player.hasLeft = true;
      player.leftReason = reason || (player.chips <= 0 ? "bankrupt" : "voluntarily_left");
      player.leftAt = new Date().toISOString();
      if (typeof finalPt === "number") {
        player.chips = finalPt;
        player.finalPt = finalPt;
      } else {
        player.finalPt = player.chips;
      }
      saveStore();
      io.emit("players_refresh", Object.values(store.players));
      io.emit("leaderboard_update", getTop3Leaderboard());
      console.log(`[Session Concluded] Participant ${player.name} (${player.uid}) marked as left. Final PT: ${player.finalPt}. Reason: ${player.leftReason}`);
    }

    res.json({ success: true });
  });

  // Register or resume participant session (players do not need passwords; manager requires password "123456")
  app.post("/api/players/register", (req, res) => {
    const { name, uid, password } = req.body;
    const rawName = String(name || "").trim();

    if (!rawName || rawName.length < 2) {
      return res.status(400).json({
        success: false,
        error: "INVALID_NAME",
        message: "Participant name must be at least 2 characters.",
      });
    }

    if (rawName.length > 32) {
      return res.status(400).json({
        success: false,
        error: "NAME_TOO_LONG",
        message: "Participant name cannot exceed 32 characters.",
      });
    }

    const normalized = rawName.toLowerCase();

    // If registering as "manager", verify password "123456"
    if (normalized === MANAGER_ID) {
      if (password !== MANAGER_PASSWORD) {
        return res.status(401).json({
          success: false,
          error: "MANAGER_PASSWORD_REQUIRED",
          message: "The name 'manager' is reserved for the study manager. Please enter the manager password.",
        });
      }

      const managerUid = "manager_root";
      const existing = store.players[managerUid];

      const managerPlayer: Player = {
        uid: managerUid,
        name: "manager",
        email: "manager@vantage.admin",
        chips: existing ? existing.chips : 10000,
        isManager: true,
        registeredAt: existing ? existing.registeredAt : new Date().toISOString(),
        lastActive: new Date().toISOString(),
        totalBets: existing ? existing.totalBets : 0,
      };

      store.players[managerUid] = managerPlayer;
      saveStore();

      io.emit("players_refresh", Object.values(store.players));

      return res.json({
        success: true,
        player: managerPlayer,
      });
    }

    // Check if participant name already exists in store
    const existingEntry = Object.values(store.players).find(
      (p) => p.name.trim().toLowerCase() === normalized && p.uid !== "manager_root"
    );

    if (existingEntry) {
      // Check if session has been permanently concluded (including bankruptcy or voluntary exit)
      if (!existingEntry.isManager && (existingEntry.hasLeft || existingEntry.chips <= 0)) {
        return res.status(403).json({
          success: false,
          error: "SESSION_CONCLUDED",
          reasonKey: "register.sessionConcluded",
          message: "This participant has concluded their session and cannot continue playing anymore.",
        });
      }

      // Existing active participant reloading/re-entering without having left:
      let assignedX = existingEntry.assignedX;
      if (typeof assignedX !== "number" || !STUDY_X_CONDITIONS.includes(assignedX as any)) {
        assignedX = assignNextConditionX();
      }

      const player: Player = {
        ...existingEntry,
        assignedX,
        lastActive: new Date().toISOString(),
      };
      store.players[existingEntry.uid] = player;
      saveStore();

      io.emit("players_refresh", Object.values(store.players));
      io.emit("leaderboard_update", getTop5Leaderboard());

      return res.json({
        success: true,
        isResumed: true,
        player,
      });
    }

    // Brand new participant visiting for the first time: Initialize with standard starting chips (1,000 PT)
    // Balanced allocation across X in [0, 5, 10, 15] so the number of players of each X is averaged
    const playerUid = uid || "sub_" + Math.random().toString(36).substring(2, 11);
    const assignedX = assignNextConditionX();
    const player: Player = {
      uid: playerUid,
      name: rawName,
      email: `${rawName}@study.subject`,
      chips: 1000,
      isManager: false,
      registeredAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      totalBets: 0,
      assignedX: assignedX,
    };
    store.players[playerUid] = player;

    saveStore();

    io.emit("players_refresh", Object.values(store.players));
    io.emit("leaderboard_update", getTop5Leaderboard());

    res.json({
      success: true,
      isResumed: false,
      player,
    });
  });

  // Public Top 3 Leaderboard API (ranked by final PT)
  app.get("/api/leaderboard/top3", (req, res) => {
    res.json(getTop3Leaderboard());
  });

  // Alias for backward compatibility
  app.get("/api/leaderboard/top5", (req, res) => {
    res.json(getTop3Leaderboard());
  });

  // Get initial shared state
  app.get("/api/state", (req, res) => {
    res.json({
      history: store.history.slice(0, 50),
      recentBets: store.bets.slice(0, 25),
      onlineCount,
      leaderboard: getTop3Leaderboard(),
    });
  });

  // Record a trial / bet directly (Tags manager bets as isTest: true)
  app.post("/api/bets/record", (req, res) => {
    const playerName = req.body.playerName || "Anonymous Participant";
    const isManagerBet =
      Boolean(req.body.isTest) ||
      playerName.trim().toLowerCase() === MANAGER_ID ||
      req.body.playerUid === "manager_root";

    // Reject bet if participant has already concluded or left
    if (!isManagerBet && req.body.playerUid && store.players[req.body.playerUid]) {
      const existingPlayer = store.players[req.body.playerUid];
      if (existingPlayer.hasLeft || existingPlayer.chips <= 0) {
        return res.status(403).json({
          success: false,
          error: "SESSION_CONCLUDED",
          message: "Participant session has concluded. No further bets can be placed.",
        });
      }
    }

    // Determine condition X: if participant has assignedX, enforce it for balanced data
    const playerUid = req.body.playerUid || "anonymous";
    const existingPlayer = playerUid && store.players[playerUid];
    let conditionX = typeof req.body.paramX === "number" ? req.body.paramX : 10;
    if (!isManagerBet && existingPlayer) {
      if (typeof existingPlayer.assignedX === "number" && STUDY_X_CONDITIONS.includes(existingPlayer.assignedX as any)) {
        conditionX = existingPlayer.assignedX;
      } else {
        conditionX = assignNextConditionX();
        existingPlayer.assignedX = conditionX;
        saveStore();
      }
    }

    const bet: BetRecord = {
      id: req.body.id || Math.random().toString(36).substring(2, 11),
      playerUid: playerUid,
      playerName: playerName,
      playerEmail: req.body.playerEmail,
      amount: Number(req.body.amount) || 10,
      type: req.body.type || "color",
      value: req.body.value || "Red",
      winningNumber: req.body.winningNumber,
      winningColor: req.body.winningColor,
      payout: req.body.payout || 0,
      status: req.body.status || "pending",
      balanceAfter: req.body.balanceAfter,
      paramX: conditionX,
      streakLength: Number(req.body.streakLength) || 1,
      counterStreakBet: Boolean(req.body.counterStreakBet),
      wagerProportion: typeof req.body.wagerProportion === "number" ? req.body.wagerProportion : undefined,
      isTest: isManagerBet,
      timestamp: req.body.timestamp || new Date().toISOString(),
    };

    // Permanently record trial into study store without truncation
    store.bets.unshift(bet);

    // Update player stats
    if (store.players[bet.playerUid]) {
      store.players[bet.playerUid].totalBets = (store.players[bet.playerUid].totalBets || 0) + 1;
      store.players[bet.playerUid].lastActive = bet.timestamp;
      if (typeof bet.balanceAfter === "number") {
        store.players[bet.playerUid].chips = bet.balanceAfter;
        store.players[bet.playerUid].finalPt = bet.balanceAfter;
        // If balance drops to 0 or less, mark participant as permanently concluded (bankrupt)
        if (bet.balanceAfter <= 0 && !store.players[bet.playerUid].isManager) {
          store.players[bet.playerUid].hasLeft = true;
          store.players[bet.playerUid].leftReason = "bankrupt";
          store.players[bet.playerUid].leftAt = bet.timestamp;
          store.players[bet.playerUid].finalPt = 0;
          console.log(`[Session Concluded - Bankrupt] Participant ${store.players[bet.playerUid].name} lost all points.`);
        }
      }
    }

    saveStore();

    io.emit("new_bet", bet);
    io.emit("players_refresh", Object.values(store.players));
    io.emit("leaderboard_update", getTop5Leaderboard());
    res.json({ success: true, bet });
  });

  // Explicit Manager Reset / Delete Study Data (Only executed when the manager explicitly requests data deletion)
  app.post("/api/study/reset-data", (req, res) => {
    const { password, confirmation } = req.body;
    if (password !== MANAGER_PASSWORD) {
      return res.status(401).json({
        success: false,
        error: "UNAUTHORIZED",
        message: "Invalid manager password. Only the manager can delete study data.",
      });
    }

    if (confirmation !== "DELETE_ALL_DATA") {
      return res.status(400).json({
        success: false,
        error: "CONFIRMATION_REQUIRED",
        message: "Explicit confirmation code 'DELETE_ALL_DATA' is required to prevent accidental deletion.",
      });
    }

    // Preserve manager account but reset its stats, clear all study participants and trials
    const managerPlayer = store.players["manager_root"];
    store.players = managerPlayer
      ? {
          manager_root: {
            ...managerPlayer,
            chips: 10000,
            totalBets: 0,
            lastActive: new Date().toISOString(),
          },
        }
      : {};
    store.bets = [];
    store.history = [];
    saveStore();

    io.emit("players_refresh", Object.values(store.players));
    io.emit("leaderboard_update", getTop5Leaderboard());

    res.json({
      success: true,
      message: "All participant logs and trial data have been successfully deleted from the study database.",
    });
  });

  // Delete a specific participant and their trials from the study
  app.post("/api/players/delete-player", (req, res) => {
    const { uid, name } = req.body;
    const targetUid = String(uid || "").trim();
    const targetName = String(name || "").trim().toLowerCase();

    const toDeleteUids = new Set<string>();

    if (targetUid && store.players[targetUid] && targetUid !== "manager_root") {
      toDeleteUids.add(targetUid);
    }

    if (targetName && targetName !== MANAGER_ID) {
      for (const p of Object.values(store.players)) {
        if (p.name.trim().toLowerCase() === targetName && p.uid !== "manager_root") {
          toDeleteUids.add(p.uid);
        }
      }
    }

    if (toDeleteUids.size === 0) {
      return res.status(404).json({ success: false, message: "Participant not found." });
    }

    for (const u of toDeleteUids) {
      delete store.players[u];
    }

    store.bets = store.bets.filter((b) => !toDeleteUids.has(b.playerUid) && !toDeleteUids.has(b.playerName.trim().toLowerCase()));
    saveStore();

    io.emit("players_refresh", Object.values(store.players));
    io.emit("leaderboard_update", getTop3Leaderboard());

    res.json({
      success: true,
      message: `Successfully deleted participant(s) and their trial records.`,
      distribution: getConditionXDistribution(),
    });
  });

  // Get all registered players for manager console
  app.get("/api/players", (req, res) => {
    res.json(Object.values(store.players));
  });

  // Get all study bets (with option to filter test wagers)
  app.get("/api/bets", (req, res) => {
    const scope = req.query.scope; // 'study' (default), 'test', or 'all'
    if (scope === "test") {
      return res.json(store.bets.filter((b) => b.isTest));
    }
    if (scope === "study") {
      return res.json(store.bets.filter((b) => !b.isTest));
    }
    res.json(store.bets);
  });

  // Get organized, structured research data per player (excluding test data from study analytics)
  app.get("/api/study/organized-data", (req, res) => {
    const studyBets = store.bets.filter((b) => !b.isTest && b.playerName.toLowerCase() !== MANAGER_ID);
    const testBets = store.bets.filter((b) => b.isTest || b.playerName.toLowerCase() === MANAGER_ID);

    // Group study bets by player UID
    const betsByPlayer: Record<string, BetRecord[]> = {};
    for (const bet of studyBets) {
      if (!betsByPlayer[bet.playerUid]) {
        betsByPlayer[bet.playerUid] = [];
      }
      betsByPlayer[bet.playerUid].push(bet);
    }

    // Create organized player summaries
    const organizedPlayers = Object.values(store.players)
      .filter((p) => p.uid !== "manager_root" && p.name.toLowerCase() !== MANAGER_ID)
      .map((p) => {
        // Sort bets in chronological order to accurately assign round numbers
        const rawBets = (betsByPlayer[p.uid] || []).slice().sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        const pBets = rawBets.map((b, idx) => ({
          ...b,
          roundNumber: idx + 1,
          paramX: b.paramX !== undefined ? b.paramX : 10,
        }));

        const totalWagered = pBets.reduce((acc, b) => acc + b.amount, 0);
        const totalWon = pBets.reduce((acc, b) => acc + (b.payout || 0), 0);
        const netPnL = totalWon - totalWagered;
        const redBets = pBets.filter((b) => b.value.toLowerCase() === "red").length;
        const blackBets = pBets.filter((b) => b.value.toLowerCase() === "black").length;
        const greenBets = pBets.filter((b) => b.value.toLowerCase() === "green").length;
        const wins = pBets.filter((b) => b.status === "won").length;
        const losses = pBets.filter((b) => b.status === "lost").length;
        const winRate = pBets.length > 0 ? Math.round((wins / pBets.length) * 100) : 0;

        // Calculate primary condition X and distinct X conditions played
        const xCounts: Record<number, number> = {};
        for (const b of pBets) {
          const x = b.paramX;
          xCounts[x] = (xCounts[x] || 0) + 1;
        }
        const distinctX = Object.keys(xCounts).map(Number);
        let primaryX = 10;
        let maxCount = -1;
        for (const [xStr, cnt] of Object.entries(xCounts)) {
          if (cnt > maxCount) {
            maxCount = cnt;
            primaryX = Number(xStr);
          }
        }
        if (pBets.length > 0 && maxCount <= 0) {
          primaryX = pBets[pBets.length - 1].paramX;
        }

        return {
          uid: p.uid,
          name: p.name,
          email: p.email,
          registeredAt: p.registeredAt,
          lastActive: p.lastActive,
          chips: p.chips,
          totalBets: pBets.length,
          totalWagered,
          totalWon,
          netPnL,
          redBets,
          blackBets,
          greenBets,
          wins,
          losses,
          winRate,
          hasLeft: Boolean(p.hasLeft || (p.chips <= 0 && !p.isManager)),
          leftReason: p.leftReason || (p.chips <= 0 ? "bankrupt" : p.hasLeft ? "voluntarily_left" : undefined),
          leftAt: p.leftAt,
          finalPt: typeof p.finalPt === "number" ? p.finalPt : p.chips,
          assignedX: typeof p.assignedX === "number" ? p.assignedX : (primaryX ?? 10),
          primaryX: typeof p.assignedX === "number" ? p.assignedX : (primaryX ?? 10),
          xConditionsPlayed: distinctX.length > 0 ? distinctX : [typeof p.assignedX === "number" ? p.assignedX : (primaryX ?? 10)],
          trials: pBets,
        };
      });

    // Overall study metrics
    const totalStudyWagered = studyBets.reduce((acc, b) => acc + b.amount, 0);
    const totalStudyPayout = studyBets.reduce((acc, b) => acc + (b.payout || 0), 0);
    const redTotal = studyBets.filter((b) => b.value.toLowerCase() === "red").length;
    const blackTotal = studyBets.filter((b) => b.value.toLowerCase() === "black").length;
    const greenTotal = studyBets.filter((b) => b.value.toLowerCase() === "green").length;

    res.json({
      studySummary: {
        totalParticipants: organizedPlayers.length,
        totalStudyBets: studyBets.length,
        totalStudyWagered,
        totalStudyPayout,
        redBetsCount: redTotal,
        blackBetsCount: blackTotal,
        greenBetsCount: greenTotal,
        redRatio: studyBets.length > 0 ? Math.round((redTotal / studyBets.length) * 100) : 0,
        blackRatio: studyBets.length > 0 ? Math.round((blackTotal / studyBets.length) * 100) : 0,
        greenRatio: studyBets.length > 0 ? Math.round((greenTotal / studyBets.length) * 100) : 0,
        conditionsDistribution: getConditionXDistribution(),
      },
      testSummary: {
        totalTestSpins: testBets.length,
        totalTestWagered: testBets.reduce((acc, b) => acc + b.amount, 0),
      },
      players: organizedPlayers,
      managerPlayer: store.players["manager_root"] || null,
    });
  });

  // API for condition distribution and balancing
  app.get("/api/study/conditions-distribution", (req, res) => {
    res.json(getConditionXDistribution());
  });

  // Rebalance existing participants evenly across conditions (averaging X0, X5, X10, X15)
  app.post("/api/study/rebalance-conditions", (req, res) => {
    const participants = Object.values(store.players)
      .filter((p) => !p.isManager && p.uid !== "manager_root" && p.name.toLowerCase() !== MANAGER_ID)
      .sort((a, b) => new Date(a.registeredAt).getTime() - new Date(b.registeredAt).getTime());

    participants.forEach((p, idx) => {
      p.assignedX = STUDY_X_CONDITIONS[idx % STUDY_X_CONDITIONS.length];
    });

    const assignedMap: Record<string, number> = {};
    for (const p of participants) {
      if (typeof p.assignedX === "number") assignedMap[p.uid] = p.assignedX;
    }
    for (const b of store.bets) {
      if (!b.isTest && assignedMap[b.playerUid] !== undefined) {
        b.paramX = assignedMap[b.playerUid];
      }
    }

    saveStore();
    io.emit("players_refresh", Object.values(store.players));
    res.json({
      success: true,
      message: "Participants successfully balanced and averaged across conditions X=[0, 5, 10, 15].",
      distribution: getConditionXDistribution(),
    });
  });

  // API for Academic Research Analytics Suite (Surge curves, summary tables, direction rates, ANOVA, box plots)
  app.get("/api/study/research-analytics", (req, res) => {
    const analytics = computeResearchAnalytics(store.bets);
    res.json(analytics);
  });

  // Export 1: Summary Table & ANOVA Statistics (CSV)
  app.get("/api/export/summary-csv", (req, res) => {
    const analytics = computeResearchAnalytics(store.bets);
    const headers = [
      "Condition_X",
      "Condition_Label",
      "Sample_Size_N",
      "Bet_Bias_Index_S_ge_3",
      "Martingale_Escalation_Rate_Percent",
      "Bankrupt_or_All_In_Rate_Percent",
      "Avg_Wager_Peak_Proportion",
      "ANOVA_F_Statistic",
      "ANOVA_P_Value",
      "ANOVA_Significance",
    ];

    const rows = analytics.summaryTable.map((row) => [
      row.x,
      `"${row.label}"`,
      row.n,
      row.longStreakBiasIndex,
      row.martingaleRate,
      row.bankruptOrAllInRate,
      row.avgWagerPeak,
      analytics.anova.fStat,
      analytics.anova.pValue,
      `"${analytics.anova.significanceLabel}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `study_x_summary_anova_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csvContent);
  });

  // Export 2: Surge Curves & Directional Fallacy Streaks S=1..5 (CSV)
  app.get("/api/export/surges-csv", (req, res) => {
    const analytics = computeResearchAnalytics(store.bets);
    const headers = [
      "Streak_Length_S",
      "X0_Bet_Bias_Index",
      "X5_Bet_Bias_Index",
      "X10_Bet_Bias_Index",
      "X15_Bet_Bias_Index",
      "X0_Reverse_Direction_Rate_Pct",
      "X5_Reverse_Direction_Rate_Pct",
      "X10_Reverse_Direction_Rate_Pct",
      "X15_Reverse_Direction_Rate_Pct",
      "Rational_Baseline_Pct",
    ];

    const rows = analytics.surgeCurves.map((surge, idx) => {
      const dir = analytics.directionRate[idx] || { x0: 50, x5: 50, x10: 50, x15: 50 };
      return [
        surge.streak,
        surge.x0,
        surge.x5,
        surge.x10,
        surge.x15,
        dir.x0,
        dir.x5,
        dir.x10,
        dir.x15,
        50.0,
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `study_surge_curves_and_directional_bias_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csvContent);
  });

  // Export 3: Box Plot Peak Streak Dispersion W_t / Bankroll_t (CSV)
  app.get("/api/export/dispersion-csv", (req, res) => {
    const analytics = computeResearchAnalytics(store.bets);
    const headers = [
      "Condition_X",
      "Condition_Label",
      "Sample_Size_N",
      "Min_Wager_Proportion",
      "Q1_25th_Percentile",
      "Median_50th_Percentile",
      "Q3_75th_Percentile",
      "Max_Wager_Proportion",
      "Mean_Wager_Proportion",
      "IQR",
      "Outliers",
    ];

    const rows = analytics.boxPlotData.map((box) => [
      box.x,
      `"${box.label}"`,
      box.n,
      box.min,
      box.q1,
      box.median,
      box.q3,
      box.max,
      box.mean,
      box.iqr,
      `"${box.outliers.join("; ")}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const filename = `study_peak_streak_dispersion_boxplot_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csvContent);
  });

  // Export 4: Clean/All Study Trial Logs with Condition X & Streak Tags
  app.get("/api/export/csv", (req, res) => {
    const scope = req.query.scope || "study"; // "study" (default) or "all"

    const targetBets =
      scope === "all"
        ? store.bets
        : store.bets.filter((b) => !b.isTest && b.playerName.toLowerCase() !== MANAGER_ID);

    const headers = [
      "Trial_ID",
      "Timestamp",
      "Participant_Name",
      "Participant_UID",
      "Condition_X",
      "Streak_Length_S",
      "Counter_Streak_Bet",
      "Bet_Type",
      "Bet_Value",
      "Bet_Amount",
      "Wager_Proportion",
      "Winning_Number",
      "Winning_Color",
      "Status",
      "Payout",
      "Balance_After",
      "Is_Test_Data",
    ];

    const rows = targetBets.map((b) => [
      `"${b.id}"`,
      `"${b.timestamp}"`,
      `"${(b.playerName || "").replace(/"/g, '""')}"`,
      `"${b.playerUid}"`,
      b.paramX ?? 10,
      b.streakLength ?? 1,
      b.counterStreakBet ? "YES" : "NO",
      `"${b.type}"`,
      `"${b.value}"`,
      b.amount,
      b.wagerProportion ?? "",
      `"${b.winningNumber || ""}"`,
      `"${b.winningColor || ""}"`,
      `"${b.status || ""}"`,
      b.payout ?? 0,
      b.balanceAfter ?? "",
      b.isTest ? "YES" : "NO",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const filename =
      scope === "all"
        ? `study_trials_all_with_tests_${new Date().toISOString().slice(0, 10)}.csv`
        : `study_trials_clean_tagged_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csvContent); // Include UTF-8 BOM for Excel compatibility
  });

  // Export 5: Detailed Player Trials Grouped by Condition X (name, X, round results, bet selection, bet amount)
  app.get("/api/export/grouped-by-x-csv", (req, res) => {
    const scope = req.query.scope || "study";
    const filterX = req.query.x ? String(req.query.x).trim().toLowerCase() : "all";

    const targetBets =
      scope === "all"
        ? store.bets.slice()
        : store.bets.filter((b) => !b.isTest && b.playerName.toLowerCase() !== MANAGER_ID);

    // Group bets by Condition X
    const normalizedBets = targetBets.map((b) => ({
      ...b,
      paramX: typeof b.paramX === "number" ? b.paramX : 10,
    }));

    // Filter by specific X if requested
    const filteredBets =
      filterX !== "all" && !isNaN(Number(filterX))
        ? normalizedBets.filter((b) => b.paramX === Number(filterX))
        : normalizedBets;

    // Calculate player round numbers per player (chronological order)
    const playerTrialCounters: Record<string, number> = {};
    const chronologicalBets = filteredBets.slice().sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const betRoundNumbers: Record<string, number> = {};
    for (const b of chronologicalBets) {
      playerTrialCounters[b.playerUid] = (playerTrialCounters[b.playerUid] || 0) + 1;
      betRoundNumbers[b.id] = playerTrialCounters[b.playerUid];
    }

    // Sort grouped by Condition X (0, 5, 10, 15), then by Participant Name, then by Round Number
    const groupedBets = filteredBets.slice().sort((a, b) => {
      if (a.paramX !== b.paramX) return a.paramX - b.paramX;
      const nameCompare = (a.playerName || "").localeCompare(b.playerName || "");
      if (nameCompare !== 0) return nameCompare;
      return (betRoundNumbers[a.id] || 0) - (betRoundNumbers[b.id] || 0);
    });

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
      "Is_Test_Data",
    ];

    const rows: string[] = [];

    // Section grouping by condition X
    let currentX: number | null = null;
    for (const b of groupedBets) {
      if (b.paramX !== currentX) {
        currentX = b.paramX;
        const xBets = groupedBets.filter((item) => item.paramX === currentX);
        const xWagered = xBets.reduce((acc, item) => acc + item.amount, 0);
        const xWins = xBets.filter((item) => item.status === "won").length;
        const xWinRate = xBets.length > 0 ? Math.round((xWins / xBets.length) * 100) : 0;
        const distinctParticipants = new Set(xBets.map((item) => item.playerUid)).size;
        
        // Add readable group separator banner in CSV
        rows.push(
          `"# === GROUP: CONDITION X = ${currentX} | Participants: ${distinctParticipants} | Rounds: ${xBets.length} | Wagered: ${xWagered} PT | Win Rate: ${xWinRate}% ==="`
        );
      }

      const netPnL = (b.payout || 0) - b.amount;
      rows.push(
        [
          b.paramX,
          `"${(b.playerName || "").replace(/"/g, '""')}"`,
          `"${b.playerUid}"`,
          betRoundNumbers[b.id] || 1,
          `"${b.timestamp}"`,
          `"${b.type}"`,
          `"${(b.value || "").replace(/"/g, '""')}"`,
          b.amount,
          b.wagerProportion !== undefined ? b.wagerProportion : "",
          `"${b.winningNumber || ""}"`,
          `"${b.winningColor || ""}"`,
          `"${(b.status || "").toUpperCase()}"`,
          b.payout ?? 0,
          netPnL >= 0 ? `+${netPnL}` : `${netPnL}`,
          b.balanceAfter ?? "",
          b.streakLength ?? 1,
          b.counterStreakBet ? "YES" : "NO",
          b.isTest ? "YES" : "NO",
        ].join(",")
      );
    }

    const csvContent = [headers.join(","), ...rows].join("\n");
    const filename =
      filterX !== "all"
        ? `study_trials_grouped_X_${filterX}_${new Date().toISOString().slice(0, 10)}.csv`
        : `study_trials_grouped_by_X_all_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csvContent); // Include UTF-8 BOM
  });

  // Export 6: Raw Master Records of all players (name, x, round results, bet selection, bet amount)
  app.get("/api/export/players-raw-csv", (req, res) => {
    const scope = req.query.scope || "study";
    const targetBets =
      scope === "all"
        ? store.bets.slice()
        : store.bets.filter((b) => !b.isTest && b.playerName.toLowerCase() !== MANAGER_ID);

    // Chronological numbering
    const chronologicalBets = targetBets.slice().sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const playerTrialCounters: Record<string, number> = {};
    const betRoundNumbers: Record<string, number> = {};
    for (const b of chronologicalBets) {
      playerTrialCounters[b.playerUid] = (playerTrialCounters[b.playerUid] || 0) + 1;
      betRoundNumbers[b.id] = playerTrialCounters[b.playerUid];
    }

    // Sort by Condition X, then player name, then round
    const sortedBets = targetBets.slice().sort((a, b) => {
      const xA = typeof a.paramX === "number" ? a.paramX : 10;
      const xB = typeof b.paramX === "number" ? b.paramX : 10;
      if (xA !== xB) return xA - xB;
      const nameCompare = (a.playerName || "").localeCompare(b.playerName || "");
      if (nameCompare !== 0) return nameCompare;
      return (betRoundNumbers[a.id] || 0) - (betRoundNumbers[b.id] || 0);
    });

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
      "Is_Test_Data",
    ];

    const rows = sortedBets.map((b) => {
      const net = (b.payout || 0) - b.amount;
      return [
        `"${(b.playerName || "").replace(/"/g, '""')}"`,
        typeof b.paramX === "number" ? b.paramX : 10,
        betRoundNumbers[b.id] || 1,
        `"${b.type}"`,
        `"${(b.value || "").replace(/"/g, '""')}"`,
        b.amount,
        b.wagerProportion !== undefined ? b.wagerProportion : "",
        `"${b.winningNumber || ""}"`,
        `"${b.winningColor || ""}"`,
        `"${(b.status || "").toUpperCase()}"`,
        b.payout || 0,
        net >= 0 ? `+${net}` : `${net}`,
        b.balanceAfter !== undefined ? b.balanceAfter : "",
        `"${b.timestamp}"`,
        `"${b.playerUid}"`,
        b.streakLength || 1,
        b.counterStreakBet ? "YES" : "NO",
        b.isTest ? "YES" : "NO",
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const filename = `all_player_trial_records_grouped_by_X_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send("\uFEFF" + csvContent);
  });

  // Socket.io Logic
  io.on("connection", (socket) => {
    onlineCount++;
    io.emit("status_update", { onlineCount });

    socket.on("player_update", (data: Partial<Player> & { uid: string }) => {
      if (store.players[data.uid]) {
        store.players[data.uid] = {
          ...store.players[data.uid],
          ...data,
          lastActive: new Date().toISOString(),
        };
        saveStore();
        io.emit("players_refresh", Object.values(store.players));
        io.emit("leaderboard_update", getTop5Leaderboard());
      }
    });

    socket.on("game_result", (data: GameResult) => {
      store.history = [data, ...store.history].slice(0, 50);
      saveStore();
      io.emit("new_game_result", data);
    });

    socket.on("place_bet", (data: BetRecord) => {
      io.emit("new_bet", data);
    });

    socket.on("disconnect", () => {
      onlineCount = Math.max(0, onlineCount - 1);
      io.emit("status_update", { onlineCount });
    });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

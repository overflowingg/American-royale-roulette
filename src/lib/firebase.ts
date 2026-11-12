import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where,
  getDocs,
  getDocFromServer,
  increment
} from "firebase/firestore";
import { INITIAL_CHIPS } from "../constants";

// This will be populated by the platform if setup correctly
import config from "../../firebase-applet-config.json";

const firebaseConfig = config as any;

let app: any;
let auth: any;
let db: any;

export const isFirebaseConfigured = Boolean(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId);

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // Critical per skill
    auth = getAuth(app);
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

export { auth, db };
export const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

export async function signOut() {
  if (!auth) return;
  return auth.signOut();
}

export async function ensurePlayer(user: User, managerEmail: string | null) {
  if (!db) return null;
  const path = `players/${user.uid}`;
  try {
    const playerRef = doc(db, "players", user.uid);
    const snap = await getDoc(playerRef);
    if (!snap.exists()) {
      const isManager = user.email === managerEmail;
      const newPlayer: PlayerData = {
        uid: user.uid,
        name: user.displayName || user.email?.split("@")[0] || "Player",
        email: user.email || "",
        chips: 1000,
        isManager,
        lastActive: new Date().toISOString(),
      };
      await savePlayerToCloud(newPlayer);
      return newPlayer;
    }
    return snap.data() as PlayerData;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return null;
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Test connection on boot per skill instructions
export async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Please check your Firebase configuration or network connection.");
    }
  }
}

if (isFirebaseConfigured) {
  testConnection();
}

export interface PlayerData {
  uid: string;
  name: string;
  email?: string;
  chips: number;
  finalPt?: number;
  isManager: boolean;
  lastActive: string;
  registeredAt?: string;
  totalBets?: number;
  assignedX?: number;
  hasLeft?: boolean;
  leftReason?: "bankrupt" | "voluntarily_left";
  leftAt?: string;
}

/**
 * Helper to compute balanced condition X assignment (averaging participants across 0, 5, 10, 15)
 */
export async function getBalancedNextConditionX(): Promise<number> {
  const conditions = [0, 5, 10, 15];
  if (!isFirebaseConfigured || !db) return 0;
  try {
    const snap = await getDocs(collection(db, "players"));
    const counts: Record<number, number> = { 0: 0, 5: 0, 10: 0, 15: 0 };
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      if (data && !data.isManager && data.uid !== "manager_root") {
        const x = typeof data.assignedX === "number" ? data.assignedX : undefined;
        if (x !== undefined && counts[x] !== undefined) {
          counts[x]++;
        }
      }
    });

    let minCount = Infinity;
    let chosen = 0;
    for (const c of conditions) {
      if (counts[c] < minCount) {
        minCount = counts[c];
        chosen = c;
      }
    }
    return chosen;
  } catch (err) {
    console.warn("Error calculating balanced condition X:", err);
    return 0;
  }
}

/**
 * Save or update a player profile in Cloud Firestore
 */
export async function savePlayerToCloud(player: PlayerData): Promise<void> {
  if (!isFirebaseConfigured || !db || !player?.uid) return;
  const path = `players/${player.uid}`;
  try {
    let assignedX = player.assignedX;
    if (typeof assignedX !== "number" && !player.isManager && player.uid !== "manager_root") {
      assignedX = await getBalancedNextConditionX();
    }
    const playerRef = doc(db, "players", player.uid);
    const docData: any = {
      uid: player.uid,
      name: player.name,
      chips: Number(player.chips ?? 1000),
      finalPt: typeof player.finalPt === "number" ? player.finalPt : (player.chips ?? 1000),
      totalBets: Number(player.totalBets ?? 0),
      assignedX: typeof assignedX === "number" ? assignedX : 0,
      isManager: Boolean(player.isManager),
      hasLeft: Boolean(player.hasLeft),
      leftReason: player.leftReason || null,
      registeredAt: player.registeredAt || new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
    if (player.leftAt) {
      docData.leftAt = player.leftAt;
    }
    await setDoc(playerRef, docData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Record a trial bet in Cloud Firestore and atomically update the player's cloud stats
 */
export async function recordBetToCloud(bet: any): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const betId = bet.id || Math.random().toString(36).substring(2, 11);
  const path = `bets/${betId}`;
  try {
    const betRef = doc(db, "bets", betId);
    const betPayload = {
      id: betId,
      playerUid: String(bet.playerUid || "anonymous"),
      playerName: String(bet.playerName || "Anonymous Participant"),
      amount: Number(bet.amount || 10),
      type: String(bet.type || "color"),
      value: String(bet.value || "Red"),
      winningNumber: String(bet.winningNumber || ""),
      winningColor: String(bet.winningColor || ""),
      payout: Number(bet.payout || 0),
      status: String(bet.status || "pending"),
      balanceAfter: Number(bet.balanceAfter ?? 1000),
      paramX: Number(bet.paramX ?? 10),
      streakLength: Number(bet.streakLength ?? 1),
      counterStreakBet: Boolean(bet.counterStreakBet),
      wagerProportion: typeof bet.wagerProportion === "number" ? bet.wagerProportion : 0.1,
      isTest: Boolean(bet.isTest),
      timestamp: bet.timestamp || new Date().toISOString(),
    };
    await setDoc(betRef, betPayload);

    // Atomically update player's balance and trials count in cloud document
    if (bet.playerUid && bet.playerUid !== "anonymous") {
      const playerRef = doc(db, "players", bet.playerUid);
      const isBankrupt = Number(bet.balanceAfter) <= 0 && !bet.isTest;
      const updateData: any = {
        chips: Number(bet.balanceAfter),
        finalPt: Number(bet.balanceAfter),
        totalBets: increment(1),
        lastActive: new Date().toISOString(),
      };
      if (isBankrupt) {
        updateData.hasLeft = true;
        updateData.leftReason = "bankrupt";
        updateData.leftAt = new Date().toISOString();
      }
      await setDoc(playerRef, updateData, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Record a game spin result in Cloud Firestore
 */
export async function recordGameResultToCloud(data: { winningNumber: string; winningColor: string }): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const path = "games";
  try {
    const gamesRef = collection(db, "games");
    await addDoc(gamesRef, {
      winningNumber: String(data.winningNumber),
      winningColor: String(data.winningColor),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Fetch a player from Cloud Firestore by unique UID
 */
export async function fetchCloudPlayerByUid(uid: string): Promise<PlayerData | null> {
  if (!isFirebaseConfigured || !db || !uid) return null;
  const path = `players/${uid}`;
  try {
    const playerRef = doc(db, "players", uid);
    const snap = await getDoc(playerRef);
    if (snap.exists()) {
      return snap.data() as PlayerData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Fetch a player from Cloud Firestore by nickname
 */
export async function fetchCloudPlayerByName(name: string): Promise<PlayerData | null> {
  if (!isFirebaseConfigured || !db || !name) return null;
  const path = "players";
  try {
    const playersRef = collection(db, "players");
    const q = query(playersRef, where("name", "==", name.trim()), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as PlayerData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return null;
  }
}

/**
 * Real-time subscription to all players for leaderboards & manager console
 */
export function subscribeToAllPlayers(callback: (players: PlayerData[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const path = "players";
  try {
    const playersRef = collection(db, "players");
    const unsubscribe = onSnapshot(
      playersRef,
      (snapshot) => {
        const players = snapshot.docs.map((doc) => doc.data() as PlayerData);
        callback(players);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

/**
 * Real-time subscription to study bets for analytics and trial logs
 */
export function subscribeToAllBets(callback: (bets: any[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const path = "bets";
  try {
    const betsRef = collection(db, "bets");
    const q = query(betsRef, orderBy("timestamp", "desc"), limit(250));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const bets = snapshot.docs.map((doc) => doc.data());
        callback(bets);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

/**
 * Real-time subscription to recent wheel results
 */
export function subscribeToRecentGames(callback: (games: any[]) => void): () => void {
  if (!isFirebaseConfigured || !db) return () => {};
  const path = "games";
  try {
    const gamesRef = collection(db, "games");
    const q = query(gamesRef, orderBy("timestamp", "desc"), limit(20));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const games = snapshot.docs.map((doc) => doc.data());
        callback(games);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
    return unsubscribe;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, where, getDocs } from "firebase/firestore";
import { INITIAL_CHIPS } from "../constants";

// This will be populated by the platform if setup correctly
import config from "../../firebase-applet-config.json";

const firebaseConfig = config as any;

let app: any;
let auth: any;
let db: any;

export const isFirebaseConfigured = firebaseConfig && firebaseConfig.apiKey;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // Critical per skill
  auth = getAuth(app);
}

export { auth, db };
export const googleProvider = isFirebaseConfigured ? new GoogleAuthProvider() : null;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function signIn() {
  if (!auth) throw new Error("Firebase Auth not initialized. Check configuration.");
  return signInWithPopup(auth, googleProvider);
}

export async function signOut() {
  if (!auth) return;
  return auth.signOut();
}

export interface PlayerData {
  uid: string;
  name?: string;
  email: string;
  chips: number;
  finalPt?: number;
  isManager: boolean;
  lastActive: any;
  totalBets?: number;
  assignedX?: number;
  hasLeft?: boolean;
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
        email: user.email || "",
        chips: 1000,
        isManager,
        lastActive: serverTimestamp(),
      };
      await setDoc(playerRef, newPlayer);
      return newPlayer;
    }
    
    const data = snap.data() as PlayerData;
    await setDoc(playerRef, { lastActive: serverTimestamp() }, { merge: true });
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function recordBet(bet: any) {
  if (!isFirebaseConfigured || !db) {
    const saved = localStorage.getItem("vantage_roulette_bets");
    const current = saved ? JSON.parse(saved) : [];
    localStorage.setItem("vantage_roulette_bets", JSON.stringify([{
      ...bet,
      timestamp: new Date().toISOString()
    }, ...current].slice(0, 100)));
    return;
  }
  const path = "bets";
  try {
    const betsRef = collection(db, "bets");
    return addDoc(betsRef, {
      ...bet,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function recordGameResult(data: any) {
  if (!isFirebaseConfigured || !db) {
    const saved = localStorage.getItem("vantage_roulette_history");
    const current = saved ? JSON.parse(saved) : [];
    localStorage.setItem("vantage_roulette_history", JSON.stringify([{
      ...data,
      timestamp: new Date().toISOString()
    }, ...current].slice(0, 50)));
    return;
  }
  const path = "games";
  try {
    const gamesRef = collection(db, "games");
    return addDoc(gamesRef, {
      ...data,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateChips(uid: string, amount: number) {
  if (!isFirebaseConfigured || !db) {
    const saved = localStorage.getItem("vantage_roulette_state");
    const state = saved ? JSON.parse(saved) : { balance: INITIAL_CHIPS };
    const newBalance = (state.balance || INITIAL_CHIPS) + amount;
    localStorage.setItem("vantage_roulette_state", JSON.stringify({
      ...state,
      balance: newBalance
    }));
    return;
  }
  const path = `players/${uid}`;
  try {
    const playerRef = doc(db, "players", uid);
    const snap = await getDoc(playerRef);
    if (snap.exists()) {
      const current = snap.data().chips || 0;
      await setDoc(playerRef, { chips: current + amount }, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function getAllPlayerData() {
  if (!isFirebaseConfigured || !db) {
    // Standalone fallback: Fetch from central server registry
    try {
      const res = await fetch("/api/players");
      const ct = res.headers.get("content-type") || "";
      if (res.ok && ct.includes("application/json")) return await res.json();
    } catch {
      // offline / fallback
    }
    
    // Final fallback: Local storage guest
    const saved = localStorage.getItem("vantage_roulette_state");
    const state = saved ? JSON.parse(saved) : { balance: INITIAL_CHIPS };
    return [{
      uid: "guest",
      email: "guest@example.com",
      chips: state.balance || INITIAL_CHIPS,
      isManager: true,
      lastActive: new Date().toISOString()
    }];
  }
  const path = "players";
  try {
    const playersRef = collection(db, "players");
    const snap = await getDocs(playersRef);
    return snap.docs.map(doc => doc.data() as PlayerData);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getRecentBets(limitCount = 50) {
  if (!isFirebaseConfigured || !db) {
    const saved = localStorage.getItem("vantage_roulette_bets");
    return saved ? JSON.parse(saved).slice(0, limitCount) : [];
  }
  const path = "bets";
  try {
    const betsRef = collection(db, "bets");
    const q = query(betsRef, orderBy("timestamp", "desc"), limit(limitCount));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

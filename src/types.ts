export type RouletteColor = "red" | "black" | "green";

export interface RouletteSlot {
  number: string;
  color: RouletteColor;
  index: number;
}

export type BetType = 
  | "straight" 
  | "split" 
  | "street" 
  | "corner" 
  | "five" 
  | "line" 
  | "column" 
  | "dozen" 
  | "even-odd" 
  | "red-black" 
  | "color"
  | "low-high";

export interface Bet {
  id: string;
  type: BetType;
  value: string; // e.g. "17", "Red", "1st 12", "Even"
  amount: number;
  chipColor: string;
  isTest?: boolean;
}

export interface GameState {
  balance: number;
  isSpinning: boolean;
  lastResult: RouletteSlot | null;
  history: RouletteSlot[];
  pendingBets: Bet[];
}

export interface PlayerStats {
  uid: string;
  name: string;
  email: string;
  chips: number;
  finalPt?: number;
  totalBets: number;
  biggestWin: number;
  lastActive: string;
  registeredAt?: string;
  isManager?: boolean;
  assignedX?: number;
  hasLeft?: boolean;
  leftReason?: "bankrupt" | "voluntarily_left";
  leftAt?: string;
}

export interface Participant {
  uid: string;
  name: string;
  registeredAt: string;
  chips: number;
  finalPt?: number;
  isManager?: boolean;
  assignedX?: number;
  hasLeft?: boolean;
  leftReason?: "bankrupt" | "voluntarily_left";
  leftAt?: string;
}

export interface ConditionsDistribution {
  counts: Record<number, number>;
  total: number;
  average: number;
  nextAssigned: number;
  conditions: readonly number[];
}

export interface TrialRecord {
  id: string;
  playerUid: string;
  playerName: string;
  playerEmail?: string;
  amount: number;             // How much they bet
  type: string;               // Bet type (e.g. "color", "straight", etc.)
  value: string;              // What they bet on (e.g. "Red", "Black", "17")
  winningNumber?: string;     // Round result: winning number
  winningColor?: string;      // Round result: winning color
  payout?: number;            // Round result: payout
  status?: "won" | "lost" | "pending"; // Round result: won or lost
  balanceAfter?: number;      // Round result: balance after round
  paramX?: number;            // Condition X (0, 5, 10, 15)
  streakLength?: number;
  counterStreakBet?: boolean;
  wagerProportion?: number;
  isTest?: boolean;
  timestamp: string;
  roundNumber?: number;
}

export interface OrganizedPlayerSummary {
  uid: string;
  name: string;
  email: string;
  registeredAt: string;
  lastActive: string;
  chips: number;
  totalBets: number;
  totalWagered: number;
  totalWon: number;
  netPnL: number;
  redBets: number;
  blackBets: number;
  greenBets?: number;
  wins: number;
  losses: number;
  winRate: number;
  isManager?: boolean;
  hasLeft?: boolean;
  leftReason?: "bankrupt" | "voluntarily_left";
  leftAt?: string;
  finalPt?: number;
  assignedX?: number;
  primaryX?: number;
  xConditionsPlayed?: number[];
  trials: TrialRecord[];
}

export interface AppConfig {
  managerEmail: string | null;
}

export interface LeaderboardPlayer {
  rank: number;
  uid: string;
  name: string;
  chips: number;
  finalPt?: number;
  totalBets: number;
  assignedX?: number;
  hasLeft?: boolean;
  lastActive?: string;
  winRate?: number;
}

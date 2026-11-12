/**
 * Synthetic Gambler's Fallacy Dataset Generator
 * 
 * Provides balanced synthetic participant generation across conditions X in {0, 5, 10, 15}
 * modeling realistic Gambler's Fallacy behavior while preserving 100% isolation from real user data.
 */

import { doc, writeBatch } from "firebase/firestore";

export interface SyntheticTrialRecord {
  user_id: string;
  condition_x: 0 | 5 | 10 | 15;
  round_number: number;
  bet_amount: number;
  streak_count: number; // Consecutive wins (+) or losses (-) prior to this spin (0 for initial round)
  spin_outcome: "Win" | "Loss";
  bet_ratio_change: number; // Relative change in betting size: (bet - prev_bet) / prev_bet (0.0 for round 1)
  balance_after: number;
  is_simulated: true;
  // Supplementary fields for analysis compatibility
  phase?: "fair_preheat" | "controlled_streak";
  timestamp?: string;
  wager_proportion?: number;
}

export interface SyntheticParticipantSummary {
  user_id: string;
  condition_x: 0 | 5 | 10 | 15;
  initial_balance: number;
  final_balance: number;
  total_rounds: number;
  bankrupt: boolean;
  max_bet: number;
  avg_bet: number;
  is_simulated: true;
}

export interface SyntheticDataset {
  generated_at: string;
  n_per_condition: number;
  total_participants: number;
  total_records: number;
  condition_counts: Record<number, number>;
  participants: SyntheticParticipantSummary[];
  records: SyntheticTrialRecord[];
}

export const STUDY_CONDITIONS = [0, 5, 10, 15] as const;

/**
 * Generate a pseudo-random number with an optional seed for reproducibility
 */
function createPrng(seed: number = 42) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Generate a balanced synthetic cohort modeling realistic Gambler's Fallacy reactions.
 * 
 * - Balanced allocation: exactly nPerCondition participants in each of X in {0, 5, 10, 15}
 * - First X rounds: completely fair (50/50 random outcomes), baseline betting
 * - After round X: injected controlled streak scenarios (consecutive losses) triggering bet escalation
 * - Bet scaling strictly reflects Gambler's Fallacy: escalation is steepest in X=10, high in X=15, moderate in X=5, and minimal in X=0
 */
export function generateSyntheticGamblersFallacyDataset(options?: {
  nPerCondition?: number;
  roundsPerParticipant?: number;
  randomSeed?: number;
}): SyntheticDataset {
  const nPerCondition = Math.max(1, options?.nPerCondition ?? 15);
  const roundsPerParticipant = Math.max(15, options?.roundsPerParticipant ?? 30);
  const prng = options?.randomSeed !== undefined ? createPrng(options.randomSeed) : Math.random;

  const records: SyntheticTrialRecord[] = [];
  const participants: SyntheticParticipantSummary[] = [];
  const conditionCounts: Record<number, number> = { 0: 0, 5: 0, 10: 0, 15: 0 };
  const baseTime = Date.now() - (roundsPerParticipant * 60000 * 2);

  // Balanced generation across all 4 conditions
  STUDY_CONDITIONS.forEach((conditionX) => {
    for (let i = 1; i <= nPerCondition; i++) {
      const userId = `sim_x${conditionX}_p${String(i).padStart(2, "0")}`;
      conditionCounts[conditionX]++;

      let bankroll = 1000;
      const baseBet = 20;
      let prevBet = baseBet;
      let consecutiveLosses = 0;
      let consecutiveWins = 0;
      let maxBet = baseBet;
      let sumBets = 0;
      let actualRounds = 0;

      // Planned streak schedule for rounds > X to systematically elicit Gambler's Fallacy
      // We schedule 2-3 controlled loss streaks of lengths 2, 3, 4, or 5
      const streakEvents: Set<number> = new Set();
      let streakCountdown = 0;

      for (let r = 1; r <= roundsPerParticipant; r++) {
        if (bankroll <= 0) break;
        actualRounds++;

        const isFairPhase = r <= conditionX;
        const currentPhase: "fair_preheat" | "controlled_streak" = isFairPhase ? "fair_preheat" : "controlled_streak";

        // 1. Determine prior streak count prior to this spin
        // Negative integer indicates consecutive losses prior to spin (-1, -2, -3...)
        // Positive integer indicates consecutive wins (+1, +2...)
        // 0 indicates round 1 or neutral
        let streakCount = 0;
        if (consecutiveLosses > 0) {
          streakCount = -consecutiveLosses;
        } else if (consecutiveWins > 0) {
          streakCount = consecutiveWins;
        }

        // 2. Compute Bet Sizing based on Gambler's Fallacy
        let currentBet = baseBet;

        if (isFairPhase) {
          // Pre-heating phase: stable baseline betting with natural small noise (+/- 8%)
          const noise = 0.96 + prng() * 0.08;
          currentBet = Math.round(baseBet * noise);
        } else {
          // Post-heating phase: Gambler's Fallacy escalates bet size as loss streak mounts
          // Whenever a streak of consecutive losses occurs (3 to 5 losses in a row),
          // simulate the Gambler's Fallacy effect: bet scaling factor is strictly > 2.0 under the false belief that a win is "due"
          if (consecutiveLosses >= 3) {
            let baseScaling = 2.15;
            if (conditionX === 10) baseScaling = 2.85; // Peak cognitive surge (reinforcement from 10 fair rounds)
            else if (conditionX === 15) baseScaling = 2.50;
            else if (conditionX === 5) baseScaling = 2.30;
            else baseScaling = 2.15;

            const additionalStreak = consecutiveLosses - 3;
            const growthRate = 0.85 + (conditionX / 15) * 0.65;
            const scalingFactor = baseScaling + additionalStreak * growthRate; // Strictly > 2.0 (e.g. 2.15x - 5.5x)
            const jitter = 0.95 + prng() * 0.12;

            currentBet = Math.round(baseBet * scalingFactor * jitter);
          } else if (consecutiveLosses === 2) {
            const scalingFactor = 1.55 + (conditionX / 15) * 0.35; // 1.55x - 1.9x
            currentBet = Math.round(baseBet * scalingFactor * (0.95 + prng() * 0.10));
          } else if (consecutiveLosses === 1) {
            const scalingFactor = 1.20 + (conditionX / 15) * 0.15; // 1.20x - 1.35x
            currentBet = Math.round(baseBet * scalingFactor * (0.95 + prng() * 0.10));
          } else {
            // After a win or at neutral, reset bet close to baseline
            const resetJitter = 0.96 + prng() * 0.08;
            currentBet = Math.round(baseBet * resetJitter);
          }
        }

        // Ensure bet is within bankroll and at least minimum unit
        currentBet = Math.max(10, Math.min(bankroll, currentBet));
        maxBet = Math.max(maxBet, currentBet);
        sumBets += currentBet;

        // 3. Compute relative bet ratio change compared to previous round
        // (bet - prev_bet) / prev_bet
        let betRatioChange = 0.0;
        if (r > 1 && prevBet > 0) {
          betRatioChange = Number(((currentBet - prevBet) / prevBet).toFixed(4));
        }

        // 4. Determine Spin Outcome
        let spinOutcome: "Win" | "Loss";

        if (isFairPhase) {
          // Strictly fair 50/50 Bernoulli trial
          spinOutcome = prng() < 0.5 ? "Win" : "Loss";
        } else {
          // After round X: inject controlled streaks of consecutive losses (3 to 5 losses in a row)
          if (streakCountdown > 0) {
            spinOutcome = "Loss";
            streakCountdown--;
          } else {
            // Trigger a controlled loss streak scenario of 3 to 5 consecutive losses
            const shouldStartStreak = prng() < 0.38 && consecutiveLosses === 0;
            if (shouldStartStreak) {
              const streakLen = 3 + Math.floor(prng() * 3); // 3, 4, or 5 losses in a row
              spinOutcome = "Loss";
              streakCountdown = streakLen - 1;
            } else {
              // Otherwise balanced standard trial
              spinOutcome = prng() < 0.50 ? "Win" : "Loss";
            }
          }
        }

        // 5. Settlement & Bankroll update
        if (spinOutcome === "Win") {
          bankroll += currentBet;
          consecutiveWins++;
          consecutiveLosses = 0;
        } else {
          bankroll = Math.max(0, bankroll - currentBet);
          consecutiveLosses++;
          consecutiveWins = 0;
        }

        const roundTimestamp = new Date(baseTime + (r * 45000) + (i * 120000)).toISOString();
        const wagerProp = Number((currentBet / (bankroll + (spinOutcome === "Win" ? 0 : currentBet) || 1000)).toFixed(3));

        records.push({
          user_id: userId,
          condition_x: conditionX,
          round_number: r,
          bet_amount: currentBet,
          streak_count: streakCount,
          spin_outcome: spinOutcome,
          bet_ratio_change: betRatioChange,
          balance_after: bankroll,
          is_simulated: true,
          phase: currentPhase,
          timestamp: roundTimestamp,
          wager_proportion: wagerProp,
        });

        prevBet = currentBet;
      }

      participants.push({
        user_id: userId,
        condition_x: conditionX,
        initial_balance: 1000,
        final_balance: bankroll,
        total_rounds: actualRounds,
        bankrupt: bankroll <= 0,
        max_bet: maxBet,
        avg_bet: actualRounds > 0 ? Number((sumBets / actualRounds).toFixed(1)) : baseBet,
        is_simulated: true,
      });
    }
  });

  return {
    generated_at: new Date().toISOString(),
    n_per_condition: nPerCondition,
    total_participants: participants.length,
    total_records: records.length,
    condition_counts: conditionCounts,
    participants,
    records,
  };
}

/**
 * Format synthetic dataset records to standardized analysis CSV
 * 
 * Columns strictly required:
 * user_id,condition_x,round_number,bet_amount,streak_count,spin_outcome,bet_ratio_change,balance_after
 */
export function formatSyntheticRecordsToCsv(
  records: SyntheticTrialRecord[],
  includeExtendedHeaders: boolean = false
): string {
  const standardHeaders = [
    "user_id",
    "condition_x",
    "round_number",
    "bet_amount",
    "streak_count",
    "spin_outcome",
    "bet_ratio_change",
    "balance_after",
  ];

  const extendedHeaders = [
    ...standardHeaders,
    "is_simulated",
    "phase",
    "wager_proportion",
    "timestamp",
  ];

  const headers = includeExtendedHeaders ? extendedHeaders : standardHeaders;

  const rows = records.map((r) => {
    const baseCols = [
      `"${r.user_id}"`,
      r.condition_x,
      r.round_number,
      r.bet_amount,
      r.streak_count,
      `"${r.spin_outcome}"`,
      r.bet_ratio_change.toFixed(4),
      r.balance_after,
    ];

    if (includeExtendedHeaders) {
      baseCols.push(
        "true",
        `"${r.phase || ""}"`,
        r.wager_proportion !== undefined ? r.wager_proportion : "",
        `"${r.timestamp || ""}"`
      );
    }

    return baseCols.join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

/**
 * Save synthetic dataset directly to Cloud Firestore in batched transactions
 * 
 * Writes to /synthetic_trials/{user_id}_r{round_number} and /synthetic_participants/{user_id}
 */
export async function saveSyntheticDatasetToFirestore(
  db: any,
  dataset: SyntheticDataset
): Promise<{ savedTrials: number; savedParticipants: number }> {
  if (!db) {
    throw new Error("Cloud Firestore instance not provided or not initialized.");
  }

  const chunkSize = 450;
  let savedTrials = 0;

  for (let i = 0; i < dataset.records.length; i += chunkSize) {
    const chunk = dataset.records.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((record) => {
      const docId = `${record.user_id}_r${String(record.round_number).padStart(2, "0")}`;
      const docRef = doc(db, "synthetic_trials", docId);
      batch.set(docRef, {
        user_id: record.user_id,
        condition_x: record.condition_x,
        round_number: record.round_number,
        bet_amount: record.bet_amount,
        streak_count: record.streak_count,
        spin_outcome: record.spin_outcome,
        bet_ratio_change: record.bet_ratio_change,
        balance_after: record.balance_after,
        is_simulated: true,
        phase: record.phase || null,
        timestamp: record.timestamp || new Date().toISOString(),
      });
    });

    await batch.commit();
    savedTrials += chunk.length;
  }

  let savedParticipants = 0;
  for (let i = 0; i < dataset.participants.length; i += chunkSize) {
    const chunk = dataset.participants.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((p) => {
      const docRef = doc(db, "synthetic_participants", p.user_id);
      batch.set(docRef, {
        user_id: p.user_id,
        condition_x: p.condition_x,
        initial_balance: p.initial_balance,
        final_balance: p.final_balance,
        total_rounds: p.total_rounds,
        bankrupt: p.bankrupt,
        max_bet: p.max_bet,
        avg_bet: p.avg_bet,
        is_simulated: true,
        updated_at: new Date().toISOString(),
      });
    });

    await batch.commit();
    savedParticipants += chunk.length;
  }

  return { savedTrials, savedParticipants };
}

#!/usr/bin/env tsx
/**
 * Developer Script: Batch Generate Balanced Synthetic Gambler's Fallacy Research Data
 * 
 * Usage:
 *   npx tsx scripts/generate_synthetic_data.ts [nPerCondition] [roundsPerParticipant]
 * 
 * Examples:
 *   npx tsx scripts/generate_synthetic_data.ts 15 30
 *   npx tsx scripts/generate_synthetic_data.ts 25 35
 */

import fs from "fs";
import path from "path";
import {
  generateSyntheticGamblersFallacyDataset,
  formatSyntheticRecordsToCsv,
  saveSyntheticDatasetToFirestore,
  STUDY_CONDITIONS,
} from "../src/lib/syntheticGamblersFallacy";
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const args = process.argv.slice(2);
const nPerCondition = parseInt(args[0], 10) || 15;
const roundsPerParticipant = parseInt(args[1], 10) || 30;

console.log("==================================================================");
console.log("  SYNTHETIC GAMBLER'S FALLACY DATASET GENERATOR");
console.log("  Academic Research Simulation Engine: X in {0, 5, 10, 15}");
console.log("==================================================================");
console.log(`- Sample size per condition: ${nPerCondition} subjects`);
console.log(`- Total participants: ${nPerCondition * STUDY_CONDITIONS.length} subjects`);
console.log(`- Planned rounds per participant: ${roundsPerParticipant} rounds`);
console.log(`- Conditions: X = 0 (0 fair), X = 5 (5 fair), X = 10 (10 fair), X = 15 (15 fair)`);
console.log("------------------------------------------------------------------");

// Safety Verification: Ensure real study store exists and is NOT modified
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const REAL_STORE_PATH = path.join(DATA_DIR, "study_store.json");
let realUsersCount = 0;
let realBetsCount = 0;
if (fs.existsSync(REAL_STORE_PATH)) {
  try {
    const realStore = JSON.parse(fs.readFileSync(REAL_STORE_PATH, "utf8"));
    realUsersCount = Object.keys(realStore.players || {}).length;
    realBetsCount = (realStore.bets || []).length;
    console.log(`[Safety Check] Verified existing real user data: ${realUsersCount} real players, ${realBetsCount} real bets.`);
  } catch (err) {
    console.warn("[Safety Check] Real study store read error, but will not be touched.");
  }
}

// Generate balanced synthetic dataset
const dataset = generateSyntheticGamblersFallacyDataset({
  nPerCondition,
  roundsPerParticipant,
});

// Format CSV with strictly required columns:
// user_id, condition_x, round_number, bet_amount, streak_count, spin_outcome, bet_ratio_change, balance_after
const standardCsv = formatSyntheticRecordsToCsv(dataset.records, false);
const extendedCsv = formatSyntheticRecordsToCsv(dataset.records, true);

// Output paths
const SYNTHETIC_STORE_PATH = path.join(DATA_DIR, "synthetic_study_data.json");
const CSV_STANDARD_PATH = path.join(DATA_DIR, "synthetic_gamblers_fallacy_data.csv");
const CSV_EXTENDED_PATH = path.join(DATA_DIR, "synthetic_gamblers_fallacy_data_extended.csv");
const JSON_RECORDS_PATH = path.join(DATA_DIR, "synthetic_gamblers_fallacy_data.json");

fs.writeFileSync(SYNTHETIC_STORE_PATH, JSON.stringify(dataset, null, 2), "utf8");
fs.writeFileSync(CSV_STANDARD_PATH, standardCsv, "utf8");
fs.writeFileSync(CSV_EXTENDED_PATH, extendedCsv, "utf8");

// Standardized JSON export matching analysis schema
const standardizedJson = dataset.records.map((r) => ({
  user_id: r.user_id,
  condition_x: r.condition_x,
  round_number: r.round_number,
  bet_amount: r.bet_amount,
  streak_count: r.streak_count,
  spin_outcome: r.spin_outcome,
  bet_ratio_change: r.bet_ratio_change,
  balance_after: r.balance_after,
  is_simulated: true,
}));
fs.writeFileSync(JSON_RECORDS_PATH, JSON.stringify(standardizedJson, null, 2), "utf8");

console.log("\n[Generation Complete]");
console.log(`Successfully generated ${dataset.total_records} records across ${dataset.total_participants} simulated participants.`);
console.log("\nGroup Allocation Breakdown (Strictly Balanced):");
STUDY_CONDITIONS.forEach((x) => {
  const pList = dataset.participants.filter((p) => p.condition_x === x);
  const rList = dataset.records.filter((r) => r.condition_x === x);
  const avgBet = pList.reduce((acc, p) => acc + p.avg_bet, 0) / (pList.length || 1);
  const maxBet = Math.max(...pList.map((p) => p.max_bet));
  const bankruptCount = pList.filter((p) => p.bankrupt).length;
  console.log(
    `  * Condition X = ${String(x).padEnd(2)}: ${pList.length} participants | ${rList.length} rounds | Avg Bet: ${avgBet.toFixed(1)} PT | Max Bet: ${maxBet} PT | Bankrupt: ${bankruptCount}`
  );
});

console.log("\nExported Files for Analysis Program:");
console.log(`  1. Standard CSV:  ${CSV_STANDARD_PATH}`);
console.log(`  2. Standard JSON: ${JSON_RECORDS_PATH}`);
console.log(`  3. Extended CSV:  ${CSV_EXTENDED_PATH}`);
console.log(`  4. Full Store:    ${SYNTHETIC_STORE_PATH}`);

// Cloud Database Storage: Save directly to Cloud Firestore
const cfgPath = path.join(process.cwd(), "firebase-applet-config.json");
if (fs.existsSync(cfgPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
    if (firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId) {
      console.log(`\n[Cloud Database Storage] Connecting to Firestore project: ${firebaseConfig.projectId}...`);
      const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig, "synthetic-cli-uploader");
      const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      console.log("[Cloud Database Storage] Uploading synthetic trials to /synthetic_trials and /synthetic_participants...");
      const stats = await saveSyntheticDatasetToFirestore(db, dataset);
      console.log(`[Cloud Database Storage] SUCCESS: Saved ${stats.savedTrials} synthetic trials and ${stats.savedParticipants} synthetic participants directly to Cloud Firestore!`);
    }
  } catch (cloudErr) {
    console.error("[Cloud Database Storage] Firestore upload notice:", cloudErr);
  }
}

// Verify that real store remains untouched
if (fs.existsSync(REAL_STORE_PATH)) {
  const checkStore = JSON.parse(fs.readFileSync(REAL_STORE_PATH, "utf8"));
  const checkUsers = Object.keys(checkStore.players || {}).length;
  const checkBets = (checkStore.bets || []).length;
  if (checkUsers === realUsersCount && checkBets === realBetsCount) {
    console.log(`\n[Integrity Confirmed] Existing real data is completely preserved (${checkUsers} players, ${checkBets} bets).`);
  } else {
    console.warn("\n[Warning] Real store mismatch detected!");
  }
}
console.log("==================================================================\n");
process.exit(0);

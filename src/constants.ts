import { RouletteSlot } from "./types";

export const AMERICAN_WHEEL_SEQUENCE: string[] = [
  "0", "28", "9", "26", "30", "11", "7", "20", "32", "17", "5", "22", "34", "15", "3", "24", "36", "13", "1",
  "00", "27", "10", "25", "29", "12", "8", "19", "31", "18", "6", "21", "33", "16", "4", "23", "35", "14", "2"
];

export const RED_NUMBERS = new Set(["1", "3", "5", "7", "9", "12", "14", "16", "18", "19", "21", "23", "25", "27", "30", "32", "34", "36"]);
export const BLACK_NUMBERS = new Set(["2", "4", "6", "8", "10", "11", "13", "15", "17", "20", "22", "24", "26", "28", "29", "31", "33", "35"]);

export const WHEEL_SLOTS: RouletteSlot[] = AMERICAN_WHEEL_SEQUENCE.map((num, i) => ({
  number: num,
  color: num === "0" || num === "00" ? "green" : RED_NUMBERS.has(num) ? "red" : "black",
  index: i
}));

export const INITIAL_CHIPS = 1000;

export const BET_PAYOUTS: Record<string, number> = {
  "straight": 35,
  "split": 17,
  "street": 11,
  "corner": 8,
  "five": 6,
  "line": 5,
  "column": 2,
  "dozen": 2,
  "even-odd": 1,
  "red-black": 1,
  "color": 1,
  "low-high": 1
};

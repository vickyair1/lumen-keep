// Gold, score and lives: the numbers the HUD shows and the victory screen
// totals. Interest on banked gold rewards the player who saves instead of
// spending everything the moment it arrives.

import { ECONOMY } from './config.js';

export function waveClearBonus(wave) {
  return ECONOMY.waveBonusBase + ECONOMY.waveBonusPerWave * wave;
}

export function interestOn(gold) {
  return Math.min(ECONOMY.interestCap, Math.floor(gold * ECONOMY.interestRate));
}

// High score, kept in localStorage when the browser allows it.
const KEY = 'lumen-keep-highscore-v1';

export function loadHighScore() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return typeof parsed.score === 'number' ? parsed.score : 0;
  } catch (e) {
    return 0;
  }
}

export function saveHighScore(score, wave, difficulty) {
  try {
    const prev = loadHighScore();
    if (score <= prev) return false;
    window.localStorage.setItem(KEY, JSON.stringify({
      score, wave, difficulty, when: Date.now(),
    }));
    return true;
  } catch (e) {
    return false;
  }
}

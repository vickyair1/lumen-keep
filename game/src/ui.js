// The DOM around the canvas: the HUD bar, the build bar, the tower panel,
// the screens (title, pause, victory, defeat, help), toasts and the wave
// banner. All text the player reads lives here — including the goal and the
// controls on the title screen, which the screenshots show.

import { TOWERS, TOWER_ORDER, TOTAL_WAVES, wavePreview } from './config.js';
import { towerStats, upgradeCost, canUpgrade, towerSellValue } from './towers.js';
import { fmt, fmtTime } from './utils.js';
import { loadHighScore } from './economy.js';

const $ = (id) => document.getElementById(id);

let bannerTimer = null;
let toastTimer = null;

// Wire every button once, at boot. `actions` is the game's control surface.
export function initUI(actions) {
  // Build buttons: one per tower, with hotkey, cost and a colour chip.
  const wrap = $('tower-buttons');
  wrap.innerHTML = '';
  TOWER_ORDER.forEach((key, i) => {
    const def = TOWERS[key];
    const btn = document.createElement('button');
    btn.className = 'tower-btn';
    btn.dataset.tower = key;
    btn.innerHTML =
      `<span class="tower-chip" style="background:${def.color}"></span>` +
      `<span class="tower-name">${def.short}</span>` +
      `<span class="tower-cost">🪙 ${def.cost}</span>` +
      `<span class="tower-key">${i + 1}</span>`;
    btn.title = `${def.name} — ${def.desc}`;
    btn.addEventListener('click', () => actions.chooseBuild(key));
    wrap.appendChild(btn);
  });

  $('btn-wave').addEventListener('click', () => actions.startWave());
  $('btn-speed').addEventListener('click', () => actions.toggleSpeed());
  $('btn-pause').addEventListener('click', () => actions.togglePause());
  $('btn-mute').addEventListener('click', () => actions.toggleMute());
  $('btn-help').addEventListener('click', () => actions.showHelp());
  $('btn-help-title').addEventListener('click', () => actions.showHelp());
  $('btn-start').addEventListener('click', () => actions.startGame());
  $('btn-resume').addEventListener('click', () => actions.togglePause());
  $('btn-restart-pause').addEventListener('click', () => actions.restart());
  $('btn-title-pause').addEventListener('click', () => actions.toTitle());
  $('btn-again-victory').addEventListener('click', () => actions.restart());
  $('btn-again-defeat').addEventListener('click', () => actions.restart());
  $('btn-close-help').addEventListener('click', () => actions.closeHelp());
  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => actions.setDifficulty(btn.dataset.diff));
  });
  refreshHighScore();
}

export function refreshHighScore() {
  const hs = loadHighScore();
  const el = $('title-highscore');
  if (el) el.textContent = hs > 0 ? `Best score: ${fmt(hs)}` : 'No victories yet — the Keep awaits.';
}

// Every frame (cheap: only writes when a value changed).
const last = {};
function setText(id, value) {
  if (last[id] !== value) {
    last[id] = value;
    const el = $(id);
    if (el) el.textContent = value;
  }
}

export function updateHUD(state) {
  setText('hud-gold', fmt(state.gold));
  setText('hud-lives', String(state.lives));
  setText('hud-wave', `${Math.min(state.wave + 1, TOTAL_WAVES)}/${TOTAL_WAVES}`);
  setText('hud-score', fmt(state.score));
  const remaining = state.phase === 'wave'
    ? state.spawnQueue.length + state.enemies.filter((e) => e.alive).length
    : 0;
  setText('hud-enemies', state.phase === 'wave' ? `Foes left: ${remaining}` : 'Build, then send the wave');
  setText('btn-speed', state.speed === 2 ? '2×' : '1×');
  setText('btn-mute', state.muted ? '🔇' : '🔊');

  // Build buttons: affordability + the active choice.
  document.querySelectorAll('.tower-btn').forEach((btn) => {
    const def = TOWERS[btn.dataset.tower];
    btn.classList.toggle('afford', state.gold >= def.cost);
    btn.classList.toggle('active', state.buildChoice === btn.dataset.tower);
    btn.disabled = state.screen !== 'playing' || state.phase === 'over';
  });

  // Start Wave button: label + preview of the coming wave.
  const waveBtn = $('btn-wave');
  if (state.screen === 'playing' && state.phase === 'build' && state.wave < TOTAL_WAVES) {
    waveBtn.disabled = false;
    waveBtn.textContent = `▶ Send wave ${state.wave + 1}`;
    setText('wave-preview', wavePreview(state.wave));
  } else if (state.phase === 'wave') {
    waveBtn.disabled = true;
    waveBtn.textContent = 'Wave in progress…';
    setText('wave-preview', '');
  } else {
    waveBtn.disabled = true;
    waveBtn.textContent = '▶ Send wave';
  }

  updateSelectionPanel(state);
}

function updateSelectionPanel(state) {
  const panel = $('selection-panel');
  const t = state.selectedTower;
  if (!t) {
    const hint = state.buildChoice
      ? `${TOWERS[state.buildChoice].name} selected — click a glowing plot to build (right-click or Esc to cancel).`
      : 'Click a plot to build. Click a tower to upgrade or sell it. Hotkeys 1–4 pick a tower, Space sends the wave.';
    if (last.selection !== hint) {
      last.selection = hint;
      panel.innerHTML = `<div class="hint">${hint}</div>`;
    }
    return;
  }
  const stats = towerStats(t);
  const key = `tower-${t.id}-${t.level}-${state.gold}`;
  if (last.selection === key) return;
  last.selection = key;
  const upCost = upgradeCost(t);
  const canUp = canUpgrade(t);
  panel.innerHTML =
    `<div class="sel-head"><span class="tower-chip" style="background:${t.def.color}"></span>` +
    `<strong>${t.def.name}</strong> <span class="sel-level">Lv ${t.level + 1}</span></div>` +
    `<div class="sel-stats">Damage ${stats.dmg} · Range ${stats.range} · ` +
    `${stats.splash ? `Splash ${stats.splash} · ` : ''}` +
    `${stats.slow ? `Slow ${Math.round(stats.slow * 100)}% · ` : ''}` +
    `${stats.rate}/s</div>` +
    `<div class="sel-actions">` +
    (canUp
      ? `<button id="btn-upgrade" ${state.gold < upCost ? 'disabled' : ''}>⬆ Upgrade — 🪙 ${upCost}</button>`
      : `<span class="sel-max">MAX LEVEL</span>`) +
    `<button id="btn-sell">Sell — 🪙 ${towerSellValue(t)}</button></div>`;
  const up = $('btn-upgrade');
  if (up) up.addEventListener('click', () => state.actions.upgradeSelected());
  $('btn-sell').addEventListener('click', () => state.actions.sellSelected());
}

// Screens: only one overlay visible at a time ('none' hides all).
export function showScreen(name) {
  for (const id of ['screen-title', 'screen-pause', 'screen-victory', 'screen-defeat', 'screen-help']) {
    $(id).classList.toggle('hidden', id !== `screen-${name}`);
  }
  if (name === 'title') refreshHighScore();
}

export function fillEndScreen(state, victory) {
  const stats = [
    ['Score', fmt(state.score)],
    ['Waves cleared', `${victory ? TOTAL_WAVES : state.wave}/${TOTAL_WAVES}`],
    ['Foes destroyed', fmt(state.kills)],
    ['Gold earned', fmt(state.goldEarned)],
    ['Time', fmtTime(state.elapsed)],
    ['Difficulty', state.difficultyLabel],
  ];
  const html = stats.map(([k, v]) =>
    `<div class="stat-row"><span>${k}</span><strong>${v}</strong></div>`).join('');
  if (victory) {
    $('victory-stats').innerHTML = html;
    $('victory-best').textContent = state.newBest ? '★ NEW BEST SCORE ★' : '';
  } else {
    $('defeat-stats').innerHTML = html;
  }
}

// Big centre banner ("WAVE 5 — THE TITAN WAKES"), fading on its own.
export function banner(text, ms = 2200) {
  const el = $('banner');
  el.textContent = text;
  el.classList.remove('hidden');
  el.classList.remove('fade');
  void el.offsetWidth; // restart the CSS animation
  el.classList.add('fade');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

// Small toast under the HUD ("Wave cleared! +40g, interest +12g").
export function toast(text, ms = 2600) {
  const el = $('toast');
  el.textContent = text;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
}

export function setDifficultyButtons(diff) {
  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.diff === diff);
  });
}

[![best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![rank](https://make.fun/badge/best-game-01/vickyair1/lumen-keep/rank.svg)](https://make.fun/bounty/best-game-01)
[![reward](https://make.fun/badge/best-game-01/vickyair1/lumen-keep/reward.svg)](https://make.fun/bounty/best-game-01)

# Lumen Keep — Hold the Light

A complete, original tower-defense game that plays offline in a desktop browser from its own files. An entry for [make.fun's "Make the best game" bounty](https://make.fun/bounty/best-game-01).

The Ink Tide crawls out of the dark sea to swallow the last lighthouse. Build towers on the stone plots, stop **15 waves**, and the Keep stands. Let the tide through too many times and the light goes out.

## What is in the game

- **4 towers, each with a job**: Ember Turret (rapid bolts), Prism Spire (splash bursts), Gale Fan (slows the tide), Nova Mortar (heavy shells) — each upgradable twice, each sellable for 70%.
- **6 foes**: fast Motes, Husks, very fast Wraiths, tanky Brutes, Spitters that split into Motes when killed, and the **Gloom Titan** boss on waves 5, 10 and 15.
- **An economy with a choice**: kills pay gold, clearing a wave pays a bonus, and banked gold earns 4% interest per wave. Spend now or let it grow.
- **Two difficulties**, a pause menu, 1×/2× speed, mute, a high score that persists, and full keyboard + mouse controls.
- **Synthesized sound**: every effect and the ambient pad are made live with WebAudio — no audio files, no network.
- **Original art**: the night shore, the road, the Keep and its sweeping light, and every tower and foe are drawn in code on canvas.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it over

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/game/, out/screenshots/ and out/dossier.json
```

## Layout

- `game/` — the playable game: `index.html`, `style.css`, and `src/` (one file per system: `config`, `map`, `enemies`, `towers`, `projectiles`, `waves`, `economy`, `particles`, `audio`, `render`, `input`, `ui`, `shots`, `main`).
- `screenshots/` — 4 real renders of the game's own code: title, early defence, a late wave, victory.
- `main.ts` — the handover program; `vendor/makefun-game.ts` is the kit's file, unchanged.

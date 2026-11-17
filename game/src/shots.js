// Screenshot setups: real game states, built with the game's own functions,
// so the screenshots in screenshots/ are true renders of the game's code.
// Open the game with ?shot=title | early | late | victory | defeat.
// The capture script waits a few seconds after load, so waves are mid-flow.

export function setupShot(game, name) {
  if (name === 'title') return; // the title screen is the default state
  if (name === 'early') {
    game.startGame();
    game.setGold(300);
    // A young defence: two Embers and a Prism by the first bend.
    game.placeTowerAt(8, 'ember');
    game.placeTowerAt(9, 'ember');
    game.placeTowerAt(15, 'prism');
    game.startWave();
    return;
  }
  if (name === 'late') {
    game.startGame();
    game.setGold(4200);
    // A mature board: mixed towers, several upgraded, across the whole shore.
    const build = [
      [1, 'ember'], [2, 'nova'], [3, 'prism'], [7, 'gale'], [8, 'ember'],
      [9, 'prism'], [10, 'ember'], [11, 'gale'], [14, 'nova'], [15, 'prism'],
      [16, 'ember'], [17, 'gale'], [21, 'ember'], [22, 'prism'], [23, 'nova'],
    ];
    for (const [plot, kind] of build) game.placeTowerAt(plot, kind);
    for (const plot of [2, 9, 14, 15, 23]) game.upgradeTowerAt(plot);
    for (const plot of [9, 15]) game.upgradeTowerAt(plot);
    game.startWaveAt(11); // wave 12: brutes, spitters and a mote flood
    return;
  }
  if (name === 'victory') {
    game.startGame();
    game.debugEnd(true, {
      score: 24830, kills: 341, goldEarned: 3980, elapsed: 812, wave: 15,
      gold: 640, lives: 14,
    });
    return;
  }
  if (name === 'defeat') {
    game.startGame();
    game.debugEnd(false, {
      score: 11840, kills: 214, goldEarned: 2410, elapsed: 655, wave: 9,
      gold: 210, lives: 0,
    });
  }
}

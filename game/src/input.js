// Keyboard and mouse: translates raw DOM events into game actions.
// The game object supplies pickAt / setHover / key, so this file knows
// nothing about towers or waves — only buttons and pointers.

import { TOWER_ORDER } from './config.js';

function canvasPos(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

export function attachInput(canvas, game) {
  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPos(canvas, event);
    game.setHover(p.x, p.y);
  });
  canvas.addEventListener('mouseleave', () => {
    game.setHover(-1, -1);
  });
  canvas.addEventListener('click', (event) => {
    const p = canvasPos(canvas, event);
    game.pickAt(p.x, p.y);
  });
  // Keep the page from scrolling on Space / arrows while playing.
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const k = event.key.toLowerCase();
    if (k === ' ' || k.startsWith('arrow')) event.preventDefault();
    if (k >= '1' && k <= '4') {
      game.key(`build-${TOWER_ORDER[Number(k) - 1]}`);
      return;
    }
    if (k === ' ') game.key('start-wave');
    else if (k === 'escape') game.key('escape');
    else if (k === 'p') game.key('pause');
    else if (k === 'f') game.key('speed');
    else if (k === 'm') game.key('mute');
    else if (k === 'enter') game.key('confirm');
  });
}

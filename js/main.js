/* js/main.js — Entry point */
'use strict';

// Verify all modules are loaded
if (!window.STS) { console.error('STS namespace not found!'); }
if (!STS.CARDS)   { console.error('STS.CARDS not found!'); }
if (!STS.ENEMIES) { console.error('STS.ENEMIES not found!'); }
if (!STS.RELICS)  { console.error('STS.RELICS not found!'); }
if (!STS.Map)     { console.error('STS.Map not found!'); }
if (!STS.Combat)  { console.error('STS.Combat not found!'); }
if (!STS.Game)    { console.error('STS.Game not found!'); }
if (!STS.UI)      { console.error('STS.UI not found!'); }

// Start the game
window.addEventListener('DOMContentLoaded', () => {
  STS.UI.render();
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  const cs = STS.Game.combatState;
  if (!cs) return;

  // E = End turn
  if (e.key === 'e' || e.key === 'E') {
    if (cs.phase === 'player' && !cs.ended) {
      STS.Combat.endPlayerTurn(cs);
    }
  }
});

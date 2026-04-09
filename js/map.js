/* js/map.js — Map generation for the game */
'use strict';
window.STS = window.STS || {};

STS.Map = (function() {

  const NODE_TYPES = {
    M: { symbol: '⚔️', label: 'Monster',   css: 'node-type-M' },
    E: { symbol: '💀', label: 'Elite',      css: 'node-type-E' },
    R: { symbol: '🔥', label: 'Rest Site',  css: 'node-type-R' },
    S: { symbol: '💰', label: 'Shop',       css: 'node-type-S' },
    T: { symbol: '🎁', label: 'Treasure',   css: 'node-type-T' },
    Q: { symbol: '❓', label: 'Event',      css: 'node-type-Q' },
    B: { symbol: '👹', label: 'Boss',       css: 'node-type-B' }
  };

  // Distribution weights by floor tier
  // tier 0: floors 0-3 (easy), tier 1: floors 4-8, tier 2: floors 9-14, tier 3: floor 15 (boss)
  const DISTRIBUTIONS = [
    { M:60, E:0,  R:0,  S:5,  T:5,  Q:30 }, // early
    { M:50, E:10, R:10, S:8,  T:7,  Q:15 }, // mid
    { M:35, E:15, R:20, S:10, T:5,  Q:15 }, // late
  ];

  function weightedRandom(weights) {
    const keys = Object.keys(weights);
    const total = keys.reduce((s, k) => s + weights[k], 0);
    let r = Math.random() * total;
    for (const k of keys) {
      r -= weights[k];
      if (r <= 0) return k;
    }
    return keys[keys.length - 1];
  }

  function generate(act) {
    const FLOORS = 15; // 0..14 = content, floor 15 = boss
    const rows = [];

    // Generate nodes per floor
    for (let f = 0; f < FLOORS; f++) {
      const isFirst = f === 0;
      const nodesInRow = isFirst ? 1 : 2 + Math.floor(Math.random() * 3); // 2-4 nodes
      const row = [];

      let tier;
      if (f < 4) tier = 0;
      else if (f < 9) tier = 1;
      else tier = 2;

      for (let i = 0; i < nodesInRow; i++) {
        let type;
        // Restrict first two floors to monsters only (no elites)
        if (f < 2) {
          type = 'M';
        } else if (f === FLOORS - 1) {
          // Second-to-last floor before boss: only rest sites
          type = 'R';
        } else {
          type = weightedRandom(DISTRIBUTIONS[tier]);
          // Ensure at least one rest site in late game
          if (f > 10 && row.filter(n => n.type === 'R').length === 0 && i === nodesInRow - 1) {
            type = 'R';
          }
        }

        row.push({
          id: `${f}-${i}`,
          floor: f,
          pos: i,
          type,
          visited: false,
          available: false,
          connections: [] // indices of nodes in next floor
        });
      }
      rows.push(row);
    }

    // Boss floor
    rows.push([{
      id: `${FLOORS}-0`,
      floor: FLOORS,
      pos: 0,
      type: 'B',
      visited: false,
      available: false,
      connections: []
    }]);

    // Generate connections between floors
    for (let f = 0; f < FLOORS; f++) {
      const curr = rows[f];
      const next = rows[f + 1];

      // Ensure every node has at least one connection forward
      // and every node in next floor has at least one connection from
      curr.forEach(node => {
        // Connect to 1-2 random nodes in the next floor
        const targetCount = Math.min(next.length, 1 + Math.floor(Math.random() * 2));
        const shuffled = [...next].sort(() => Math.random() - 0.5);
        for (let t = 0; t < targetCount; t++) {
          if (!node.connections.includes(shuffled[t].pos)) {
            node.connections.push(shuffled[t].pos);
          }
        }
      });

      // Make sure every node in next floor is reachable
      next.forEach((nextNode, ni) => {
        const reachable = curr.some(n => n.connections.includes(ni));
        if (!reachable) {
          const src = curr[Math.floor(Math.random() * curr.length)];
          if (!src.connections.includes(ni)) src.connections.push(ni);
        }
      });

      // Sort connections
      curr.forEach(node => node.connections.sort());
    }

    // First row is always available
    rows[0].forEach(n => n.available = true);

    // Choose act boss pool
    const bossPools = {
      1: ['slime_boss', 'the_guardian', 'hexaghost'],
      2: ['the_champ', 'automaton'],
      3: ['donu_and_deca', 'time_eater', 'awakened_one']
    };
    const bossPool = bossPools[act] || bossPools[1];
    const bossId = bossPool[Math.floor(Math.random() * bossPool.length)];

    return { rows, act, bossId };
  }

  function getNode(map, floor, pos) {
    if (floor < 0 || floor >= map.rows.length) return null;
    return map.rows[floor][pos] || null;
  }

  function markVisited(map, floor, pos) {
    const node = getNode(map, floor, pos);
    if (node) {
      node.visited = true;
      node.available = false;
    }
    // Mark next floor nodes as available
    if (node && floor + 1 < map.rows.length) {
      node.connections.forEach(nextPos => {
        const nextNode = map.rows[floor + 1][nextPos];
        if (nextNode) nextNode.available = true;
      });
    }
  }

  return { generate, getNode, markVisited, NODE_TYPES };
})();

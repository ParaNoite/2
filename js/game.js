/* js/game.js — Game state machine */
'use strict';
window.STS = window.STS || {};

STS.Game = (function() {

  /* ── State ── */
  const state = {
    screen: 'title', // title | charSelect | map | combat | reward | rest | shop | event | treasure | gameover | victory
    character: null,
    player: null,          // { hp, maxHp, maxEnergy }
    playerMaxHp: 80,
    deck: [],              // [{id, upgraded}]
    relics: [],            // relic ids
    potions: [],           // potion ids
    gold: 99,
    act: 1,
    floor: 0,
    map: null,
    currentNode: null,
    combatState: null,
    pendingReward: null,   // { gold, cards[], relic? }
    pendingEncounter: null,
    stats: {
      floorsClimbed: 0,
      enemiesKilled: 0,
      damageDealt: 0,
      goldEarned: 0
    }
  };

  /* ── Character definitions ── */
  const CHARS = {
    ironclad: {
      id: 'ironclad', name: 'Ironclad', icon: '⚔️', color: '#c0392b',
      maxHp: 80, energy: 3,
      startingDeck: [
        {id:'strike', count:5}, {id:'defend', count:4}, {id:'bash', count:1}
      ],
      startingRelic: 'burning_blood',
      desc: 'A warrior who uses Strength to overpower enemies. Starting relic heals after each combat.'
    },
    silent: {
      id: 'silent', name: 'Silent', icon: '🗡️', color: '#27ae60',
      maxHp: 70, energy: 3,
      startingDeck: [
        {id:'strike', count:5}, {id:'defend', count:5}, {id:'survivor', count:1}
      ],
      startingRelic: 'ring_of_snake',
      desc: 'A deadly rogue who uses Poison and Shivs. Starting relic draws extra cards on the first turn.'
    }
  };

  /* ── Relic helpers ── */
  function hasRelic(id) { return state.relics.includes(id); }
  function getRelics() {
    return state.relics.map(id => STS.RELICS[id]).filter(Boolean);
  }
  function addRelic(id) {
    if (!state.relics.includes(id)) state.relics.push(id);
  }
  function removeRelic(id) {
    const idx = state.relics.indexOf(id);
    if (idx !== -1) state.relics.splice(idx, 1);
  }
  function addPotion(id) {
    if (state.potions.length < 3) state.potions.push(id);
  }

  /* ── New Game ── */
  function newGame(charId) {
    const char = CHARS[charId];
    if (!char) return;
    state.character = charId;
    state.player = { hp: char.maxHp, maxHp: char.maxHp };
    state.playerMaxHp = char.maxHp;
    state.maxEnergy = char.energy;
    state.deck = [];
    state.relics = [];
    state.potions = [];
    state.gold = 99;
    state.act = 1;
    state.floor = 0;
    state.currentNode = null;
    state.pendingEncounter = null;
    state.stats = { floorsClimbed:0, enemiesKilled:0, damageDealt:0, goldEarned:99 };

    // Build starting deck
    char.startingDeck.forEach(entry => {
      for (let i = 0; i < entry.count; i++) {
        state.deck.push({id: entry.id, upgraded: false});
      }
    });

    // Starting relic
    addRelic(char.startingRelic);

    // Generate act 1 map
    state.map = STS.Map.generate(1);

    goToScreen('map');
  }

  /* ── Screen navigation ── */
  function goToScreen(screen, data) {
    state.screen = screen;
    state.screenData = data || null;
    STS.UI.render();
  }

  /* ── Node selection ── */
  function selectNode(floor, pos) {
    const node = STS.Map.getNode(state.map, floor, pos);
    if (!node || (!node.available && !node.current)) return;
    if (!node.available) return;

    // Mark visited
    STS.Map.markVisited(state.map, floor, pos);
    state.currentNode = node;
    state.floor = floor;
    state.stats.floorsClimbed++;

    switch (node.type) {
      case 'M': startCombat(getNormalEnemies()); break;
      case 'E': startCombat(getEliteEnemies(), true); break;
      case 'B': startCombat([state.map.bossId], false, true); break;
      case 'R': goToScreen('rest'); break;
      case 'S': goToScreen('shop'); break;
      case 'T': goToScreen('treasure'); break;
      case 'Q': goToScreen('event', pickEvent()); break;
    }
  }

  /* ── Enemy selection ── */
  function getNormalEnemies() {
    const act = state.act;
    const pools = {
      1: [
        ['cultist'],
        ['jaw_worm'],
        ['louse_red', 'louse_green'],
        ['fungal_beast', 'fungal_beast'],
        ['blue_slaver'],
        ['red_slaver'],
        ['louse_red', 'louse_red', 'louse_green'],
        ['jaw_worm', 'louse_red'],
      ],
      2: [
        ['chosen'],
        ['byrd', 'byrd', 'byrd'],
        ['book_of_stabbing'],
        ['centurion'],
        ['chosen', 'byrd'],
        ['centurion', 'byrd'],
      ],
      3: [
        ['spire_guard'],
        ['spire_archer', 'spire_archer'],
        ['transient'],
        ['spire_guard', 'spire_archer'],
        ['spire_guard', 'spire_guard'],
      ]
    };
    const pool = pools[act] || pools[1];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getEliteEnemies() {
    const act = state.act;
    const pools = {
      1: [['gremlin_nob'], ['lagavulin']],
      2: [['gremlin_leader'], ['slavers']],
      3: [['nemesis'], ['giant_head']]
    };
    const pool = pools[act] || pools[1];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /* ── Combat ── */
  function startCombat(enemyIds, isElite = false, isBoss = false) {
    state.isElite = isElite;
    state.isBoss = isBoss;

    const playerState = {
      hp: state.player.hp,
      maxHp: state.player.maxHp,
      maxEnergy: state.maxEnergy || 3,
      deck: [...state.deck],
      act: state.act
    };

    const combatState = STS.Combat.create(enemyIds, playerState);
    combatState.onUpdate = (event) => {
      state.player.hp = combatState.player.hp;
      state.player.maxHp = combatState.player.maxHp;
      STS.UI.updateCombat(combatState, event);
    };
    combatState.onEnd = (won) => {
      state.player.hp = combatState.player.hp;
      state.player.maxHp = combatState.player.maxHp;
      if (won) {
        state.stats.enemiesKilled += enemyIds.length;
        onCombatWon(isElite, isBoss);
      } else {
        goToScreen('gameover');
      }
    };
    combatState.notifyFn = (msg) => STS.UI.notify(msg);

    state.combatState = combatState;
    goToScreen('combat');

    // Start combat after render
    setTimeout(() => STS.Combat.startCombat(combatState), 100);
  }

  function onCombatWon(isElite, isBoss) {
    if (isBoss) {
      if (state.act >= 3) {
        goToScreen('victory');
        return;
      }
      // Advance to next act
      state.act++;
      state.floor = 0;
      state.map = STS.Map.generate(state.act);
      state.gold += 100;
      // Give boss relic
      giveRandomBossRelic();
      goToScreen('map');
      return;
    }

    // Build reward
    const goldReward = isElite
      ? 25 + Math.floor(Math.random() * 30)
      : 10 + Math.floor(Math.random() * 20);
    state.gold += goldReward;
    state.stats.goldEarned += goldReward;

    const cardReward = pickCardReward();
    const reward = { gold: goldReward, cards: cardReward };

    // Elite: also give relic
    if (isElite) {
      const relicId = getRandomRelic('uncommon');
      if (relicId) reward.relic = relicId;
    }

    state.pendingReward = reward;
    goToScreen('reward');
  }

  function pickCardReward() {
    // Pick 3 cards relevant to current character
    const char = state.character;
    const allCards = Object.values(STS.CARDS).filter(c => {
      if (c.rarity === 'special' || c.rarity === 'starter') return false;
      if (c.for !== 'all' && c.for !== char) return false;
      return true;
    });

    // Rarity weights: common 60%, uncommon 37%, rare 3%
    const weighted = [];
    allCards.forEach(c => {
      const w = c.rarity === 'common' ? 60 : c.rarity === 'uncommon' ? 37 : c.rarity === 'colorless' ? 20 : 3;
      weighted.push({card: c, w});
    });

    const chosen = [];
    const used = new Set();
    let attempts = 0;
    while (chosen.length < 3 && attempts < 100) {
      attempts++;
      const total = weighted.reduce((s, e) => s + e.w, 0);
      let r = Math.random() * total;
      for (const entry of weighted) {
        r -= entry.w;
        if (r <= 0) {
          if (!used.has(entry.card.id)) {
            chosen.push(entry.card);
            used.add(entry.card.id);
          }
          break;
        }
      }
    }
    return chosen;
  }

  /* ── Relics ── */
  function getRandomRelic(rarity) {
    const pool = Object.values(STS.RELICS).filter(r =>
      (r.for === 'all' || r.for === state.character) &&
      !state.relics.includes(r.id) &&
      (rarity ? r.rarity === rarity : true)
    );
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)].id;
  }

  function giveRandomBossRelic() {
    const id = getRandomRelic('boss');
    if (id) addRelic(id);
  }

  /* ── Events ── */
  function pickEvent() {
    const evt = STS.EVENTS[Math.floor(Math.random() * STS.EVENTS.length)];
    return evt;
  }

  /* ── Shop ── */
  function generateShop() {
    const char = state.character;
    const allCards = Object.values(STS.CARDS).filter(c => {
      if (c.rarity === 'special' || c.rarity === 'starter') return false;
      if (c.for !== 'all' && c.for !== char) return false;
      return true;
    });

    function pickRandCard(rarity) {
      const pool = allCards.filter(c => c.rarity === rarity);
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    const shopCards = [
      pickRandCard('common'), pickRandCard('common'),
      pickRandCard('uncommon'), pickRandCard('uncommon'),
      pickRandCard('rare'),
      pickRandCard('colorless')
    ].filter(Boolean);

    const shopRelics = [];
    const relicPool = [...STS.SHOP.relicPool];
    for (let i = 0; i < 3; i++) {
      if (relicPool.length === 0) break;
      const idx = Math.floor(Math.random() * relicPool.length);
      const id = relicPool.splice(idx, 1)[0];
      if (!state.relics.includes(id)) shopRelics.push(STS.RELICS[id]);
    }

    const shopPotions = Object.values(STS.POTIONS)
      .sort(() => Math.random() - 0.5).slice(0, 2);

    return { cards: shopCards, relics: shopRelics, potions: shopPotions };
  }

  /* ── Treasure ── */
  function getTreasureRelic() {
    return getRandomRelic('uncommon') || getRandomRelic('common');
  }

  /* ── Public API ── */
  return {
    state,
    CHARS,
    hasRelic,
    getRelics,
    addRelic,
    removeRelic,
    addPotion,
    newGame,
    goToScreen,
    selectNode,
    startCombat,
    onCombatWon,
    pickCardReward,
    generateShop,
    getTreasureRelic,
    getRandomRelic,
    pickEvent,

    // Forwarded state props (for backwards compat)
    get character() { return state.character; },
    get player() { return state.player; },
    get deck() { return state.deck; },
    get relics() { return state.relics; },
    get potions() { return state.potions; },
    get gold() { return state.gold; },
    set gold(v) { state.gold = v; },
    get act() { return state.act; },
    get floor() { return state.floor; },
    get map() { return state.map; },
    get maxEnergy() { return state.maxEnergy || 3; },
    get playerMaxHp() { return state.playerMaxHp; },
    set playerMaxHp(v) { state.playerMaxHp = v; if (state.player) state.player.maxHp = v; },
    get combatState() { return state.combatState; },
    get isElite() { return state.isElite; },
    get isBoss() { return state.isBoss; }
  };
})();

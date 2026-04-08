/* js/ui.js — UI Rendering */
'use strict';
window.STS = window.STS || {};

STS.UI = (function() {

  const screen = () => document.getElementById('screen');
  const overlay = () => document.getElementById('overlay');
  const tooltip = () => document.getElementById('tooltip');
  const notifEl = () => document.getElementById('notification');

  let notifTimer = null;
  let pendingDiscardCount = 0;
  let pendingUpgradeHand = false;

  /* ── Notification ── */
  function notify(msg) {
    if (!msg) return;
    const el = notifEl();
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(notifTimer);
    notifTimer = setTimeout(() => el.classList.remove('show'), 2000);
  }

  /* ── Damage float text ── */
  function showDamageText(amount, anchorEl, type = 'dmg') {
    if (!anchorEl || !amount) return;
    const el = document.createElement('div');
    el.className = `damage-text ${type}`;
    el.textContent = (type === 'heal' ? '+' : '-') + amount;

    const rect = anchorEl.getBoundingClientRect();
    el.style.left = (rect.left + rect.width / 2 - 15 + (Math.random() - 0.5) * 40) + 'px';
    el.style.top = (rect.top + rect.height / 2 - 15) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  /* ── Tooltip ── */
  function setupTooltip(el, content) {
    el.addEventListener('mouseenter', (e) => {
      const tip = tooltip();
      tip.innerHTML = content;
      tip.classList.add('active');
      positionTooltip(e);
    });
    el.addEventListener('mousemove', positionTooltip);
    el.addEventListener('mouseleave', () => tooltip().classList.remove('active'));
  }
  function positionTooltip(e) {
    const tip = tooltip();
    const x = e.clientX + 16;
    const y = e.clientY + 16;
    const maxX = window.innerWidth - tip.offsetWidth - 8;
    const maxY = window.innerHeight - tip.offsetHeight - 8;
    tip.style.left = Math.min(x, maxX) + 'px';
    tip.style.top = Math.min(y, maxY) + 'px';
  }

  /* ── Card HTML ── */
  function cardHtml(card, large = false, selectable = false, showRarity = false) {
    const def = card.def || STS.CARDS[card.id];
    if (!def) return '';
    const cls = large ? 'card-large' : 'card';
    const upgraded = card.upgraded || false;
    const desc = def.desc ? def.desc(upgraded) : '';
    const name = upgraded ? def.name + '+' : def.name;
    const cost = card.cost !== undefined ? card.cost : def.cost;
    const costClass = cost === 0 ? 'zero' : cost === 'X' ? 'x' : '';
    const exhaust = card.exhaust || (def.exhaust === true) || (typeof def.exhaust === 'function' && def.exhaust(upgraded));
    const ethereal = def.ethereal;
    const innate = def.innate;
    const rarityClass = showRarity ? `rarity-${def.rarity}` : '';
    const upgradeClass = upgraded ? 'card-upgraded' : '';
    const innateClass = innate ? 'card-innate' : '';
    const etherealClass = ethereal ? 'card-ethereal' : '';

    return `<div class="${cls} ${def.type} ${rarityClass} ${upgradeClass} ${innateClass} ${etherealClass}" data-id="${def.id}" data-upgraded="${upgraded}">
      <div class="card-cost ${costClass}">${cost === 'X' ? 'X' : cost}</div>
      <div class="card-name">${name}</div>
      <div class="card-type-icon">${def.icon || '🃏'}</div>
      <div class="card-desc">${desc}${exhaust ? '<br><span style="color:#7f8c8d;font-size:9px">Exhaust</span>' : ''}${ethereal ? '<br><span style="color:#8e44ad;font-size:9px">Ethereal</span>' : ''}</div>
    </div>`;
  }

  /* ── Status badges ── */
  function statusBadges(statuses, forPlayer = true) {
    if (!statuses) return '';
    const STATUS_DEFS = {
      strength: { label: 'Str', tip: 'Increases Attack damage.' },
      dexterity: { label: 'Dex', tip: 'Increases Block from skills.' },
      vulnerable: { label: 'Vuln', tip: 'Take 50% more damage from Attacks.' },
      weak: { label: 'Weak', tip: 'Deal 25% less damage with Attacks.' },
      poison: { label: 'Psn', tip: 'At end of turn, take damage equal to Poison, then reduce by 1.' },
      thorns: { label: 'Thorn', tip: 'When attacked, deal Thorns damage back.' },
      ritual: { label: 'Ritual', tip: 'At end of turn, gain Strength equal to Ritual stacks.' },
      metallicize: { label: 'Metal', tip: 'At end of turn, gain Block equal to Metallicize stacks.' },
      'demon-form': { label: 'Demon', tip: 'At start of each turn, gain Strength.' },
      barricade: { label: 'Barricade', tip: 'Block no longer expires at end of turn.' },
      flex: { label: 'Flex', tip: 'Temp Strength gained from Flex.' },
      'feel-no-pain': { label: 'FNP', tip: 'Gain Block whenever you Exhaust a card.' },
      entangled: { label: 'Entangled', tip: 'Cannot play Attack cards this turn.' },
      intangible: { label: 'Intangible', tip: 'Take 1 damage from all sources.' },
      frail: { label: 'Frail', tip: 'Block cards give 25% less Block.' },
      artifact: { label: 'Art', tip: 'Negates next debuff.' },
      rage: { label: 'Rage', tip: 'Gain Block when playing Attacks.' },
      rupture: { label: 'Rupture', tip: 'Gain Strength when losing HP from card effects.' },
      juggernaut: { label: 'Jugger', tip: 'Deal damage to random enemy when gaining Block.' },
      corruption: { label: 'Corrupt', tip: 'Skills cost 0 and Exhaust.' },
      evolve: { label: 'Evolve', tip: 'Draw when getting Status cards.' },
      'fire-breathing': { label: 'FireBr', tip: 'Deal damage when getting Status/Curse.' },
      burst: { label: 'Burst', tip: 'Next Skill(s) are played twice.' },
      caltrops: { label: 'Caltrops', tip: 'Apply Weak to attackers.' },
      footwork: { label: 'Foot', tip: 'Permanent Dexterity.' },
      'noxious-fumes': { label: 'NoFumes', tip: 'Apply Poison to all enemies each turn.' },
      tools: { label: 'Tools', tip: 'Draw 1, discard 1 each turn.' },
      'double-tap': { label: 'DblTap', tip: 'Next Attack plays twice.' },
      'next-turn-energy': { label: '+⚡', tip: 'Gain energy next turn.' },
      'next-turn-draw': { label: '+🃏', tip: 'Draw cards next turn.' },
      phantasmal: { label: 'Phantasm', tip: 'Double next attack damage.' },
      'corpse-explosion': { label: 'CorpExp', tip: 'On death, deal damage equal to Poison to all.' }
    };

    return Object.entries(statuses)
      .filter(([k, v]) => v !== 0)
      .map(([k, v]) => {
        const def = STATUS_DEFS[k] || { label: k, tip: k };
        const cls = `status-${k}`;
        const sign = v > 0 ? '' : '';
        return `<span class="status-badge ${cls}" data-tip="${def.tip}: ${v}">${def.label} ${v}</span>`;
      }).join('');
  }

  /* ── HP Bar ── */
  function hpBar(hp, maxHp, width = 100) {
    const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
    return `<div class="hp-bar" style="width:${width}px">
      <div class="hp-bar-fill" style="width:${pct}%"></div>
    </div>`;
  }

  /* ── Relic badges ── */
  function relicBadge(relicId, small = false) {
    const r = STS.RELICS[relicId];
    if (!r) return '';
    const tip = `<strong>${r.name}</strong><br>${r.desc}`;
    return `<div class="relic-badge" data-relic="${relicId}" title="${r.name}: ${r.desc}">${r.icon}</div>`;
  }

  /* ══════════════════════════════════════════════
     TITLE SCREEN
  ══════════════════════════════════════════════ */
  function renderTitle() {
    screen().innerHTML = `
      <div id="title-screen">
        <div class="game-title">⚔️ Spire of Shadows</div>
        <div class="game-subtitle">A ROGUELIKE DECKBUILDER</div>
        <div class="model-tag">Built by Claude Sonnet 4.5 (Anthropic)</div>
        <button class="btn btn-primary" id="btn-play" style="font-size:20px;padding:14px 40px">
          ▶ START ADVENTURE
        </button>
        <div style="margin-top:20px;font-size:13px;color:#7f8c8d;max-width:400px;text-align:center;line-height:1.6">
          Climb the Spire, build your deck, slay monsters,<br>
          and defeat the boss at the end of each Act.
        </div>
      </div>`;
    document.getElementById('btn-play').onclick = () => STS.Game.goToScreen('charSelect');
  }

  /* ══════════════════════════════════════════════
     CHARACTER SELECT
  ══════════════════════════════════════════════ */
  function renderCharSelect() {
    const chars = STS.Game.CHARS;
    screen().innerHTML = `
      <div id="char-select">
        <h2>Choose Your Character</h2>
        <div class="char-cards">
          ${Object.values(chars).map(c => `
            <div class="char-card ${c.id}" id="char-${c.id}">
              <div class="char-icon">${c.icon}</div>
              <h3>${c.name}</h3>
              <p>${c.desc}</p>
              <div class="char-hp">❤️ HP: ${c.maxHp} &nbsp; ⚡ Energy: ${c.energy}</div>
              <div style="margin-top:8px;font-size:12px;color:#7f8c8d">Starting deck:</div>
              <div style="font-size:12px;color:#bdc3c7;margin-top:4px">
                ${c.startingDeck.map(e => `${e.id.replace(/_/g,' ')} ×${e.count}`).join(', ')}
              </div>
              <button class="btn btn-primary" style="margin-top:16px;width:100%">SELECT</button>
            </div>
          `).join('')}
        </div>
        <button class="btn" id="btn-back" style="margin-top:10px">← Back</button>
      </div>`;

    Object.keys(chars).forEach(id => {
      document.getElementById(`char-${id}`).addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) {
          STS.Game.newGame(id);
        } else {
          document.querySelectorAll('.char-card').forEach(el => el.classList.remove('selected'));
          document.getElementById(`char-${id}`).classList.add('selected');
        }
      });
    });
    document.getElementById('btn-back').onclick = () => STS.Game.goToScreen('title');
  }

  /* ══════════════════════════════════════════════
     MAP SCREEN
  ══════════════════════════════════════════════ */
  function renderMap() {
    const G = STS.Game;
    const map = G.map;
    const p = G.player;

    const mapHTML = buildMapHTML(map);

    screen().innerHTML = `
      <div id="map-screen">
        <div class="map-header">
          <div class="act-info">Act ${G.act} — Floor ${G.floor}</div>
          <div class="player-bar">
            <div class="hp-bar-container">
              ❤️ ${hpBar(p.hp, p.maxHp, 100)}
              <span class="hp-text">${p.hp} / ${p.maxHp}</span>
            </div>
            <div class="gold-display">💰 ${G.gold}</div>
            <div class="relics-display">${G.relics.map(id => relicBadge(id)).join('')}</div>
          </div>
          <div class="potions-display">
            ${G.potions.map((pid, i) => {
              const pot = STS.POTIONS[pid];
              return pot ? `<div class="potion-slot filled" data-idx="${i}" title="${pot.name}: ${pot.desc}">${pot.icon}</div>` : '';
            }).join('')}
            ${G.potions.length < 3 ? `<div class="potion-slot" title="Empty potion slot">○</div>` : ''}
          </div>
          <button class="btn" id="btn-view-deck" style="font-size:12px;padding:5px 10px">📋 Deck (${G.deck.length})</button>
        </div>
        <div class="map-body">
          ${mapHTML}
        </div>
      </div>`;

    // Node click handlers
    document.querySelectorAll('.map-node.available').forEach(el => {
      el.onclick = () => {
        const f = parseInt(el.dataset.floor);
        const p = parseInt(el.dataset.pos);
        STS.Game.selectNode(f, p);
      };
    });

    // Deck view
    document.getElementById('btn-view-deck').onclick = () => openDeckView(G.deck);

    // Potion use on map (heal potions)
    document.querySelectorAll('.potion-slot.filled').forEach(el => {
      el.onclick = () => {
        const idx = parseInt(el.dataset.idx);
        const pid = G.potions[idx];
        const pot = STS.POTIONS[pid];
        if (pot && pot.useOnMap) {
          const ctx = makeMapCtx();
          pot.use(ctx);
          G.potions.splice(idx, 1);
          render();
        }
      };
    });
  }

  function buildMapHTML(map) {
    // Calculate SVG paths
    const ROWS = map.rows.length;
    const ROW_H = 70;
    const totalH = ROWS * ROW_H + 20;
    const W = 100; // percentage

    // Draw connections as SVG lines
    const svgLines = [];
    const nodePositions = {};

    // We'll do an approximation of positions
    map.rows.forEach((row, fi) => {
      const y = (ROWS - fi - 1) * ROW_H + 35; // bottom to top
      row.forEach((node, ni) => {
        const x = (ni + 1) / (row.length + 1) * 100;
        nodePositions[node.id] = {x, y};
      });
    });

    map.rows.forEach((row, fi) => {
      if (fi >= map.rows.length - 1) return;
      row.forEach(node => {
        const from = nodePositions[node.id];
        node.connections.forEach(nextPos => {
          const nextNode = map.rows[fi + 1][nextPos];
          if (!nextNode) return;
          const to = nodePositions[nextNode.id];
          const alpha = node.visited ? '0.6' : '0.2';
          svgLines.push(`<line x1="${from.x}%" y1="${from.y}" x2="${to.x}%" y2="${to.y}" stroke="#4a5568" stroke-width="2" opacity="${alpha}"/>`);
        });
      });
    });

    const svgContent = `<svg class="map-svg" style="height:${totalH}px" viewBox="0 0 100 ${totalH}" preserveAspectRatio="none">
      ${svgLines.join('\n')}
    </svg>`;

    const nodesHTML = `<div class="map-nodes" style="height:${totalH}px;position:relative">
      ${map.rows.map((row, fi) => {
        const y = (ROWS - fi - 1) * ROW_H;
        return row.map((node, ni) => {
          const x = (ni + 1) / (row.length + 1) * 100;
          const nodeType = STS.Map.NODE_TYPES[node.type];
          let cls = `map-node ${nodeType.css}`;
          if (node.available) cls += ' available';
          else if (node.visited) cls += ' visited';
          else if (node.current) cls += ' current';
          else cls += ' locked';
          if (node.type === 'B') cls += ' boss';

          return `<div class="${cls}" style="position:absolute;left:calc(${x}% - 24px);top:${y+11}px"
            data-floor="${fi}" data-pos="${ni}" title="${nodeType.label}">
            ${nodeType.symbol}
          </div>`;
        }).join('');
      }).join('')}
    </div>`;

    return `<div class="map-container" style="height:${totalH}px;position:relative">
      ${svgContent}
      ${nodesHTML}
    </div>`;
  }

  /* ══════════════════════════════════════════════
     COMBAT SCREEN
  ══════════════════════════════════════════════ */
  function renderCombat() {
    const cs = STS.Game.combatState;
    if (!cs) return;
    const p = cs.player;
    const G = STS.Game;

    screen().innerHTML = `
      <div id="combat-screen">
        <div class="combat-header">
          <div class="combat-deck-info">
            <span class="deck-count" id="deck-count" title="Draw Pile">📚 ${p.drawPile.length}</span>
            <span class="discard-count" id="discard-count" title="Discard Pile">🗑️ ${p.discardPile.length}</span>
            <span class="exhaust-count" id="exhaust-count" title="Exhaust Pile">💨 ${p.exhaustPile.length}</span>
          </div>
          <div class="combat-floor">Act ${G.act} | Floor ${G.floor} ${G.isElite ? '⚡ ELITE' : G.isBoss ? '👹 BOSS' : ''}</div>
          <button class="end-turn-btn" id="end-turn-btn" ${cs.phase !== 'player' ? 'disabled' : ''}>
            End Turn →
          </button>
        </div>
        <div class="combat-main">
          <div class="combat-left">
            <div class="player-combat" id="player-area">
              <div class="player-name">${G.character === 'ironclad' ? '⚔️ Ironclad' : '🗡️ Silent'}</div>
              ${hpBar(p.hp, p.maxHp, 150)}
              <div class="hp-block-row">
                <span class="hp-display">❤️ ${p.hp}/${p.maxHp}</span>
                ${p.block > 0 ? `<span class="block-display">🛡️ ${p.block}</span>` : ''}
              </div>
              <div class="energy-display">
                <div class="energy-orb">${p.energy}</div>
                <span>/ ${p.maxEnergy || 3} Energy</span>
              </div>
              <div class="status-list">${statusBadges(p.statuses, true)}</div>
            </div>

            <div style="margin-top:12px">
              <div style="font-size:12px;color:#7f8c8d;margin-bottom:6px">RELICS</div>
              <div class="relic-combat-list">
                ${G.relics.map(id => relicBadge(id)).join('')}
              </div>
            </div>
          </div>

          <div class="combat-center">
            <div class="enemies-area" id="enemies-area">
              ${renderEnemies(cs)}
            </div>
          </div>

          <div class="combat-right">
            <div style="font-size:12px;color:#7f8c8d;margin-bottom:6px">POTIONS</div>
            <div class="potion-combat-list" id="potion-list">
              ${G.potions.map((pid, i) => {
                const pot = STS.POTIONS[pid];
                return pot ? `<div class="potion-item" data-idx="${i}">${pot.icon} ${pot.name}</div>` : '';
              }).join('')}
              ${G.potions.length === 0 ? '<div style="font-size:12px;color:#7f8c8d">No potions</div>' : ''}
            </div>
          </div>
        </div>

        <div class="hand-area" id="hand-area">
          ${renderHand(cs)}
        </div>
      </div>`;

    bindCombatEvents(cs);
  }

  function renderEnemies(cs) {
    return cs.enemies.map((e, i) => {
      if (!e) return '';
      const deadCls = e.dead ? ' dead' : '';
      const intent = e.intent || {type:'unknown', label:'?', icon:'❓'};
      const intentCls = intent.type.startsWith('attack') ? 'intent-attack' :
                        intent.type === 'buff' ? 'intent-buff' :
                        intent.type.startsWith('defend') ? 'intent-defend' :
                        intent.type === 'debuff' ? 'intent-debuff' : 'intent-unknown';
      const dmgLabel = intent.dmg ? ` ${intent.dmg}` : '';

      return `<div class="enemy-card${deadCls}" id="enemy-${i}" data-idx="${i}">
        <div class="enemy-intent ${intentCls}">${intent.icon}${dmgLabel} ${intent.label}</div>
        <div class="enemy-icon">${e.icon}</div>
        <div class="enemy-name">${e.name}</div>
        ${hpBar(e.hp, e.maxHp, 100)}
        <div class="enemy-hp-text">❤️ ${e.hp} / ${e.maxHp}</div>
        ${e.block > 0 ? `<div class="enemy-block">🛡️ ${e.block}</div>` : ''}
        <div class="status-list">${statusBadges(e.statuses, false)}</div>
      </div>`;
    }).join('');
  }

  function renderHand(cs) {
    const p = cs.player;
    return p.hand.map((card, idx) => {
      const effectiveCost = card.tempCost !== null ? card.tempCost : card.cost;
      const canPlay = cs.phase === 'player' &&
        !card.unplayable &&
        (card.cost === 'X' || effectiveCost <= p.energy) &&
        !(card.type === 'attack' && (p.statuses.entangled || 0) > 0);
      const unplayCls = canPlay ? '' : ' unplayable';
      const def = card.def;

      // Temporarily set cost for display
      const displayCard = {...card, cost: effectiveCost};

      return `<div class="card ${card.type}${unplayCls}" id="hand-card-${idx}"
        data-idx="${idx}" data-card-id="${card.id}">
        <div class="card-cost ${effectiveCost === 0 ? 'zero' : effectiveCost === 'X' ? 'x' : ''}">${effectiveCost === 'X' ? 'X' : effectiveCost}</div>
        <div class="card-name${card.upgraded ? ' card-upgraded' : ''}">${card.name}</div>
        <div class="card-type-icon">${card.icon}</div>
        <div class="card-desc">${card.desc}</div>
      </div>`;
    }).join('');
  }

  function bindCombatEvents(cs) {
    // End turn
    const endBtn = document.getElementById('end-turn-btn');
    if (endBtn) endBtn.onclick = () => {
      if (cs.phase === 'player' && !cs.ended) STS.Combat.endPlayerTurn(cs);
    };

    // Deck / discard view
    const deckCount = document.getElementById('deck-count');
    if (deckCount) deckCount.onclick = () => openCardListView('Draw Pile', cs.player.drawPile);
    const discardCount = document.getElementById('discard-count');
    if (discardCount) discardCount.onclick = () => openCardListView('Discard Pile', cs.player.discardPile);
    const exhaustCount = document.getElementById('exhaust-count');
    if (exhaustCount) exhaustCount.onclick = () => openCardListView('Exhaust Pile', cs.player.exhaustPile);

    // Enemy targeting
    let selectedTarget = 0;
    const aliveEnemies = cs.enemies.filter(e => e && !e.dead);
    if (aliveEnemies.length > 0) selectedTarget = 0;

    document.querySelectorAll('.enemy-card:not(.dead)').forEach(el => {
      el.onclick = () => {
        document.querySelectorAll('.enemy-card').forEach(e => e.classList.remove('targeted'));
        el.classList.add('targeted');
        selectedTarget = parseInt(el.dataset.idx);
        // Store element ref for damage text
        const eIdx = parseInt(el.dataset.idx);
        if (cs.enemies[eIdx]) cs.enemies[eIdx]._el = el;
      };
      // Default first enemy targeted
      if (el.dataset.idx === '0') {
        el.classList.add('targeted');
        if (cs.enemies[0]) cs.enemies[0]._el = el;
      }
    });

    // Update _el refs for all enemies
    document.querySelectorAll('.enemy-card').forEach(el => {
      const eIdx = parseInt(el.dataset.idx);
      if (cs.enemies[eIdx]) cs.enemies[eIdx]._el = el;
    });

    // Card clicking
    document.querySelectorAll('#hand-area .card').forEach(el => {
      el.onclick = () => {
        if (cs.phase !== 'player' || cs.ended) return;
        const idx = parseInt(el.dataset.idx);
        const card = cs.player.hand[idx];
        if (!card) return;

        // Check if card needs target
        const needsTarget = card.type === 'attack';
        const target = needsTarget ? selectedTarget : 0;

        if (cs.pendingDiscard > 0) {
          // Discarding mode
          const p = cs.player;
          p.hand.splice(idx, 1);
          p.discardPile.push(card);
          cs.pendingDiscard--;
          if (cs.pendingDiscard === 0) {
            cs.pendingDiscard = undefined;
          }
          updateCombat(cs, null);
          return;
        }

        if (cs.pendingUpgradeHand) {
          // Upgrade mode
          if (!card.upgraded && card.def.upgradedValues) {
            card.upgraded = true;
            card.name = card.def.name + '+';
            card.cost = card.def.upgradedCost !== undefined ? card.def.upgradedCost : card.def.cost;
            card.desc = card.def.desc(true);
          }
          cs.pendingUpgradeHand = false;
          updateCombat(cs, null);
          return;
        }

        STS.Combat.playCard(cs, idx, target);
      };

      // Tooltip
      el.addEventListener('mouseenter', (e) => {
        const idx = parseInt(el.dataset.idx);
        const card = cs.player.hand[idx];
        if (!card) return;
        const tip = tooltip();
        tip.innerHTML = `<strong>${card.name}</strong> (${card.type})<br>${card.desc}`;
        tip.classList.add('active');
        positionTooltip(e);
      });
      el.addEventListener('mousemove', positionTooltip);
      el.addEventListener('mouseleave', () => tooltip().classList.remove('active'));
    });

    // Potion use
    document.querySelectorAll('.potion-item').forEach(el => {
      el.onclick = () => {
        const idx = parseInt(el.dataset.idx);
        const pid = STS.Game.potions[idx];
        const pot = STS.POTIONS[pid];
        if (!pot || !pot.useInCombat) return;
        const ctx = makeCombatCtx(cs);
        if (pot.needsTarget) {
          pot.use(ctx, selectedTarget);
        } else {
          pot.use(ctx);
        }
        STS.Game.potions.splice(idx, 1);
        updateCombat(cs, null);
      };
    });

    // Status badge tooltips
    document.querySelectorAll('.status-badge').forEach(el => {
      const tip = el.dataset.tip;
      if (tip) setupTooltip(el, tip);
    });
  }

  function makeCombatCtx(cs) {
    const p = cs.player;
    return {
      status: (t, name, amt) => {
        if (t === 'player') {
          p.statuses[name] = (p.statuses[name] || 0) + amt;
        } else {
          const alive = cs.enemies.filter(e => e && !e.dead);
          const e = alive[t] || alive[0];
          if (e) e.statuses[name] = (e.statuses[name] || 0) + amt;
        }
      },
      block: (n) => { p.block += n; },
      draw: (n) => {
        // delegate to combat engine
        for (let i = 0; i < n; i++) {
          if (p.drawPile.length === 0 && p.discardPile.length > 0) {
            p.drawPile = [...p.discardPile];
            p.discardPile = [];
            for (let j = p.drawPile.length - 1; j > 0; j--) {
              const k = Math.floor(Math.random() * (j + 1));
              [p.drawPile[j], p.drawPile[k]] = [p.drawPile[k], p.drawPile[j]];
            }
          }
          const c = p.drawPile.pop();
          if (c) p.hand.push(c);
        }
      },
      gainEnergy: (n) => { p.energy += n; },
      getPlayer: () => p,
      healHp: (n) => {
        p.hp = Math.min(p.maxHp, p.hp + n);
        STS.Game.player.hp = p.hp;
      },
      attackPotion: (ti, dmg) => {
        const alive = cs.enemies.filter(e => e && !e.dead);
        const e = alive[ti] || alive[0];
        if (!e) return;
        const absorbed = Math.min(e.block, dmg);
        e.block -= absorbed;
        e.hp = Math.max(0, e.hp - (dmg - absorbed));
        if (e.hp <= 0) e.dead = true;
      }
    };
  }

  /* ── Update combat (called on state change) ── */
  function updateCombat(cs, event) {
    if (cs.ended && cs.phase === 'won') {
      // Show victory flash
      return;
    }
    if (cs.ended && cs.phase === 'lost') return;

    // Handle pending discard
    if (cs.pendingDiscard > 0) {
      // Highlight cards to discard
      document.querySelectorAll('#hand-area .card').forEach(el => {
        el.style.outline = '2px solid #e74c3c';
        el.title = 'Click to discard';
      });
      notify(`Choose ${cs.pendingDiscard} card(s) to discard`);
      return;
    }

    // Handle pending upgrade hand
    if (cs.pendingUpgradeHand) {
      document.querySelectorAll('#hand-area .card').forEach(el => {
        el.style.outline = '2px solid #f5a623';
        el.title = 'Click to upgrade';
      });
      notify('Choose a card to upgrade');
      return;
    }

    // Re-render combat
    renderCombat();
  }

  /* ══════════════════════════════════════════════
     REWARD SCREEN
  ══════════════════════════════════════════════ */
  function renderReward() {
    const reward = STS.Game.state.pendingReward;
    if (!reward) { STS.Game.goToScreen('map'); return; }

    const { gold, cards, relic } = reward;

    overlay().innerHTML = `
      <div class="overlay-panel">
        <div class="overlay-title">⚔️ Combat Reward</div>
        <div style="text-align:center;margin-bottom:16px;color:#f5a623;font-size:18px">
          💰 +${gold} Gold
        </div>
        ${relic ? `
          <div style="text-align:center;margin-bottom:16px">
            <div style="color:#bdc3c7;font-size:14px;margin-bottom:8px">Elite Reward:</div>
            <div class="treasure-relic">
              <div class="relic-icon">${STS.RELICS[relic]?.icon || '💎'}</div>
              <div>
                <h3>${STS.RELICS[relic]?.name || relic}</h3>
                <p>${STS.RELICS[relic]?.desc || ''}</p>
              </div>
            </div>
            <button class="btn btn-primary" id="take-relic-btn">Take Relic</button>
          </div>
        ` : ''}
        <div style="color:#bdc3c7;font-size:14px;margin-bottom:12px;text-align:center">Choose a card to add to your deck:</div>
        <div class="reward-cards">
          ${cards.map((c, i) => `
            <div class="card-large-wrapper" id="reward-card-${i}" style="cursor:pointer">
              ${cardHtml({id:c.id, def:c, cost:c.cost, upgraded:false, name:c.name, type:c.type, icon:c.icon, desc:c.desc(false), exhaust:c.exhaust}, true)}
            </div>
          `).join('')}
        </div>
        <div style="text-align:center;margin-top:16px">
          <button class="btn" id="skip-reward-btn">Skip Card</button>
        </div>
      </div>`;
    overlay().classList.add('active');

    // Relic pickup
    if (relic) {
      document.getElementById('take-relic-btn').onclick = () => {
        STS.Game.addRelic(relic);
        document.querySelector('.treasure-relic').style.display = 'none';
        document.getElementById('take-relic-btn').style.display = 'none';
        notify(`Obtained: ${STS.RELICS[relic]?.name}`);
      };
    }

    // Card selection
    cards.forEach((c, i) => {
      const el = document.getElementById(`reward-card-${i}`);
      if (el) el.onclick = () => {
        // Check dumbbell
        STS.Game.getRelics().forEach(r => { if (r.onCardPickup) r.onCardPickup(); });
        STS.Game.deck.push({id: c.id, upgraded: false});
        closeOverlay();
        STS.Game.goToScreen('map');
      };
    });

    document.getElementById('skip-reward-btn').onclick = () => {
      closeOverlay();
      STS.Game.goToScreen('map');
    };

    // Add card tooltips
    document.querySelectorAll('.card-large').forEach(el => {
      el.addEventListener('mouseenter', (e) => {
        const id = el.closest('[id^="reward-card-"]')?.id;
        if (!id) return;
        const idx = parseInt(id.split('-')[2]);
        const card = cards[idx];
        if (!card) return;
        const tip = tooltip();
        tip.innerHTML = `<strong>${card.name}</strong> (${card.rarity} ${card.type})<br>${card.desc(false)}`;
        tip.classList.add('active');
        positionTooltip(e);
      });
      el.addEventListener('mousemove', positionTooltip);
      el.addEventListener('mouseleave', () => tooltip().classList.remove('active'));
    });
  }

  /* ══════════════════════════════════════════════
     REST SCREEN
  ══════════════════════════════════════════════ */
  function renderRest() {
    const p = STS.Game.player;
    const canSmith = !STS.Game.hasRelic('fusion_hammer');
    const healAmount = Math.floor(p.maxHp * 0.3);

    overlay().innerHTML = `
      <div class="overlay-panel">
        <div class="overlay-title">🔥 Rest Site</div>
        <div style="text-align:center;margin-bottom:20px;color:#bdc3c7">
          You rest your weary bones by the fire...
        </div>
        <div class="rest-options">
          <div class="rest-option" id="rest-heal">
            <h4>❤️ Rest — Heal ${healAmount} HP</h4>
            <p>Current HP: ${p.hp} / ${p.maxHp} → ${Math.min(p.maxHp, p.hp + healAmount)} / ${p.maxHp}</p>
          </div>
          ${canSmith ? `
            <div class="rest-option" id="rest-smith">
              <h4>🔨 Smith — Upgrade a card</h4>
              <p>Permanently upgrade one card in your deck.</p>
            </div>
          ` : '<div style="color:#7f8c8d;font-size:13px;text-align:center">Fusion Hammer prevents Smithing.</div>'}
        </div>
      </div>`;
    overlay().classList.add('active');

    document.getElementById('rest-heal').onclick = () => {
      p.hp = Math.min(p.maxHp, p.hp + healAmount);
      closeOverlay();
      STS.Game.goToScreen('map');
    };

    if (canSmith) {
      document.getElementById('rest-smith').onclick = () => {
        closeOverlay();
        openUpgradeCard(() => STS.Game.goToScreen('map'));
      };
    }
  }

  /* ══════════════════════════════════════════════
     SHOP SCREEN
  ══════════════════════════════════════════════ */
  function renderShop() {
    const shop = STS.Game.generateShop();
    const gold = STS.Game.gold;

    const cardCosts = STS.SHOP.cardCost;
    const relicCosts = STS.SHOP.relicCost;
    const potionCost = STS.SHOP.potionCost;
    const removeCost = STS.SHOP.removeCost;

    overlay().innerHTML = `
      <div class="overlay-panel" style="min-width:600px">
        <div class="overlay-title">💰 Shop</div>
        <div class="overlay-close" id="shop-close">✕</div>
        <div style="text-align:right;margin-bottom:12px;font-size:16px;color:#f5a623">💰 ${gold} Gold</div>

        <div class="shop-section">
          <h3>Cards</h3>
          <div class="shop-items">
            ${shop.cards.map((c, i) => {
              const cost = cardCosts[c.rarity] || 100;
              const canAfford = gold >= cost;
              return `<div class="shop-item ${canAfford ? '' : 'unaffordable'}" id="shop-card-${i}" data-cost="${cost}" data-idx="${i}">
                <div style="font-size:11px;color:${c.type === 'attack' ? '#e74c3c' : c.type === 'skill' ? '#3498db' : '#9b59b6'}">${c.type.toUpperCase()}</div>
                <div style="font-size:13px;font-weight:bold;text-align:center">${c.icon} ${c.name}</div>
                <div style="font-size:10px;color:#bdc3c7;text-align:center;max-width:100px">${c.desc(false)}</div>
                <div class="shop-price">💰 ${cost}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="shop-section">
          <h3>Relics</h3>
          <div class="shop-items">
            ${shop.relics.map((r, i) => {
              const cost = relicCosts[r.rarity] || 200;
              const canAfford = gold >= cost;
              return `<div class="shop-item ${canAfford ? '' : 'unaffordable'}" id="shop-relic-${i}" data-cost="${cost}" data-idx="${i}">
                <div style="font-size:28px">${r.icon}</div>
                <div style="font-size:12px;text-align:center">${r.name}</div>
                <div style="font-size:10px;color:#bdc3c7;text-align:center;max-width:100px">${r.desc}</div>
                <div class="shop-price">💰 ${cost}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="shop-section">
          <h3>Potions</h3>
          <div class="shop-items">
            ${shop.potions.map((p, i) => {
              const canAfford = gold >= potionCost && STS.Game.potions.length < 3;
              return `<div class="shop-item ${canAfford ? '' : 'unaffordable'}" id="shop-potion-${i}" data-idx="${i}">
                <div style="font-size:28px">${p.icon}</div>
                <div style="font-size:12px;text-align:center">${p.name}</div>
                <div class="shop-price">💰 ${potionCost}</div>
              </div>`;
            }).join('')}
          </div>
        </div>

        <div class="remove-card-area">
          <div style="font-size:14px;color:#bdc3c7;margin-bottom:8px">Remove a card from your deck</div>
          <button class="btn btn-danger" id="shop-remove" ${gold < removeCost ? 'disabled' : ''}>
            Remove Card (💰 ${removeCost})
          </button>
        </div>
      </div>`;
    overlay().classList.add('active');

    document.getElementById('shop-close').onclick = () => { closeOverlay(); STS.Game.goToScreen('map'); };

    // Buy cards
    shop.cards.forEach((c, i) => {
      const el = document.getElementById(`shop-card-${i}`);
      if (!el) return;
      const cost = parseInt(el.dataset.cost);
      if (el.classList.contains('unaffordable')) return;
      el.onclick = () => {
        if (STS.Game.gold < cost) return;
        STS.Game.gold -= cost;
        STS.Game.deck.push({id: c.id, upgraded: false});
        el.style.opacity = '0.3';
        el.style.pointerEvents = 'none';
        el.querySelector('.shop-price').textContent = '✓ Purchased';
        document.querySelector('.overlay-panel').querySelector('[style*="Gold"]').textContent = `💰 ${STS.Game.gold} Gold`;
        notify(`Purchased: ${c.name}`);
      };
    });

    // Buy relics
    shop.relics.forEach((r, i) => {
      const el = document.getElementById(`shop-relic-${i}`);
      if (!el) return;
      const cost = parseInt(el.dataset.cost);
      if (el.classList.contains('unaffordable')) return;
      el.onclick = () => {
        if (STS.Game.gold < cost) return;
        STS.Game.gold -= cost;
        STS.Game.addRelic(r.id);
        el.style.opacity = '0.3';
        el.style.pointerEvents = 'none';
        notify(`Obtained: ${r.name}`);
      };
    });

    // Buy potions
    shop.potions.forEach((p, i) => {
      const el = document.getElementById(`shop-potion-${i}`);
      if (!el) return;
      if (el.classList.contains('unaffordable')) return;
      el.onclick = () => {
        if (STS.Game.gold < potionCost || STS.Game.potions.length >= 3) return;
        STS.Game.gold -= potionCost;
        STS.Game.addPotion(p.id);
        el.style.opacity = '0.3';
        el.style.pointerEvents = 'none';
        notify(`Purchased: ${p.name}`);
      };
    });

    // Remove card
    document.getElementById('shop-remove').onclick = () => {
      if (STS.Game.gold < removeCost) return;
      STS.Game.gold -= removeCost;
      closeOverlay();
      openRemoveCard(() => STS.Game.goToScreen('map'));
    };
  }

  /* ══════════════════════════════════════════════
     EVENT SCREEN
  ══════════════════════════════════════════════ */
  function renderEvent() {
    const evt = STS.Game.state.screenData;
    if (!evt) { STS.Game.goToScreen('map'); return; }

    overlay().innerHTML = `
      <div class="overlay-panel event-content">
        <div class="overlay-title">${evt.title}</div>
        <div class="event-image">${evt.icon}</div>
        <div class="event-desc">${evt.desc}</div>
        <div class="event-choices">
          ${evt.choices.map((c, i) => `
            <div class="event-choice ${c.condition && !c.condition(makeMapCtx()) ? 'unaffordable' : ''}" id="event-choice-${i}">
              ${c.text}
            </div>
          `).join('')}
        </div>
        <div id="event-result" style="display:none;margin-top:16px;padding:12px;background:rgba(0,0,0,0.3);border-radius:8px;color:#bdc3c7"></div>
      </div>`;
    overlay().classList.add('active');

    evt.choices.forEach((c, i) => {
      const el = document.getElementById(`event-choice-${i}`);
      if (!el) return;
      if (c.condition && !c.condition(makeMapCtx())) return;
      el.onclick = () => {
        c.effect(makeMapCtx());
        // Show result
        const resultEl = document.getElementById('event-result');
        if (resultEl) {
          resultEl.style.display = 'block';
          resultEl.textContent = c.result;
        }
        // Disable all choices
        document.querySelectorAll('.event-choice').forEach(e => {
          e.style.pointerEvents = 'none';
          e.style.opacity = '0.5';
        });
        // Continue button
        setTimeout(() => {
          if (resultEl) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-primary';
            btn.textContent = 'Continue';
            btn.style.marginTop = '12px';
            btn.onclick = () => { closeOverlay(); STS.Game.goToScreen('map'); };
            resultEl.appendChild(document.createElement('br'));
            resultEl.appendChild(btn);
          }
        }, 500);
      };
    });
  }

  /* ══════════════════════════════════════════════
     TREASURE SCREEN
  ══════════════════════════════════════════════ */
  function renderTreasure() {
    const relicId = STS.Game.getTreasureRelic();
    const relic = relicId ? STS.RELICS[relicId] : null;

    overlay().innerHTML = `
      <div class="overlay-panel">
        <div class="overlay-title">🎁 Treasure Chest</div>
        <div style="text-align:center;margin-bottom:20px;color:#bdc3c7">You open the chest...</div>
        ${relic ? `
          <div class="treasure-relic">
            <div class="relic-icon">${relic.icon}</div>
            <div>
              <h3>${relic.name}</h3>
              <p>${relic.desc}</p>
            </div>
          </div>
          <div style="text-align:center;margin-top:16px">
            <button class="btn btn-primary" id="take-treasure">Take ${relic.name}</button>
          </div>
        ` : `<div style="text-align:center;color:#7f8c8d">The chest is empty...</div>`}
        <div style="text-align:center;margin-top:12px">
          <button class="btn" id="skip-treasure">Leave</button>
        </div>
      </div>`;
    overlay().classList.add('active');

    if (relic) {
      document.getElementById('take-treasure').onclick = () => {
        STS.Game.addRelic(relicId);
        notify(`Obtained: ${relic.name}`);
        closeOverlay();
        STS.Game.goToScreen('map');
      };
    }
    document.getElementById('skip-treasure').onclick = () => {
      closeOverlay();
      STS.Game.goToScreen('map');
    };
  }

  /* ══════════════════════════════════════════════
     GAME OVER / VICTORY
  ══════════════════════════════════════════════ */
  function renderGameOver() {
    const G = STS.Game;
    screen().innerHTML = `
      <div class="game-over-screen">
        <div class="result-title">YOU DIED</div>
        <div style="font-size:24px;margin-bottom:20px">💀</div>
        <div class="result-stats">
          Fell on Act <strong>${G.act}</strong>, Floor <strong>${G.floor}</strong><br>
          Floors Climbed: <strong>${G.state.stats.floorsClimbed}</strong><br>
          Enemies Slain: <strong>${G.state.stats.enemiesKilled}</strong><br>
          Gold Earned: <strong>${G.state.stats.goldEarned}</strong>💰
        </div>
        <div style="margin-top:30px;display:flex;gap:16px">
          <button class="btn btn-primary" id="play-again">▶ Play Again</button>
          <button class="btn" id="main-menu">Main Menu</button>
        </div>
      </div>`;
    document.getElementById('play-again').onclick = () => STS.Game.goToScreen('charSelect');
    document.getElementById('main-menu').onclick = () => STS.Game.goToScreen('title');
  }

  function renderVictory() {
    const G = STS.Game;
    screen().innerHTML = `
      <div class="victory-screen">
        <div class="result-title">🏆 VICTORY!</div>
        <div style="font-size:24px;margin-bottom:20px">You conquered the Spire!</div>
        <div class="result-stats">
          Act: <strong>${G.act}</strong> | Floor: <strong>${G.floor}</strong><br>
          Floors Climbed: <strong>${G.state.stats.floorsClimbed}</strong><br>
          Enemies Slain: <strong>${G.state.stats.enemiesKilled}</strong><br>
          Gold Earned: <strong>${G.state.stats.goldEarned}</strong>💰<br>
          Cards in Deck: <strong>${G.deck.length}</strong><br>
          Relics: <strong>${G.relics.length}</strong>
        </div>
        <div style="margin-top:30px;display:flex;gap:16px">
          <button class="btn btn-primary" id="play-again">▶ Play Again</button>
          <button class="btn" id="main-menu">Main Menu</button>
        </div>
      </div>`;
    document.getElementById('play-again').onclick = () => STS.Game.goToScreen('charSelect');
    document.getElementById('main-menu').onclick = () => STS.Game.goToScreen('title');
  }

  /* ══════════════════════════════════════════════
     OVERLAY UTILITIES
  ══════════════════════════════════════════════ */
  function closeOverlay() {
    overlay().classList.remove('active');
    overlay().innerHTML = '';
  }

  function openDeckView(deck) {
    const cards = deck.map(c => ({
      id: c.id,
      def: STS.CARDS[c.id],
      upgraded: c.upgraded || false,
      cost: STS.CARDS[c.id]?.cost,
      name: c.upgraded ? STS.CARDS[c.id]?.name + '+' : STS.CARDS[c.id]?.name,
      type: STS.CARDS[c.id]?.type,
      icon: STS.CARDS[c.id]?.icon,
      desc: STS.CARDS[c.id]?.desc?.(c.upgraded || false)
    })).filter(c => c.def);

    overlay().innerHTML = `
      <div class="overlay-panel" style="max-width:800px">
        <div class="overlay-title">📋 Your Deck (${cards.length} cards)</div>
        <div class="overlay-close" id="deck-close">✕</div>
        <div class="deck-view-cards">
          ${cards.map(c => cardHtml(c, true, false, true)).join('')}
        </div>
      </div>`;
    overlay().classList.add('active');
    document.getElementById('deck-close').onclick = closeOverlay;
  }

  function openCardListView(title, pile) {
    const cards = pile.map(c => c);
    overlay().innerHTML = `
      <div class="overlay-panel" style="max-width:800px">
        <div class="overlay-title">${title} (${cards.length})</div>
        <div class="overlay-close" id="list-close">✕</div>
        <div class="deck-view-cards">
          ${cards.map(c => cardHtml(c, true)).join('')}
        </div>
      </div>`;
    overlay().classList.add('active');
    document.getElementById('list-close').onclick = closeOverlay;
  }

  function openUpgradeCard(callback) {
    const deck = STS.Game.deck;
    const upgradeable = deck.filter(c => {
      const def = STS.CARDS[c.id];
      return def && !c.upgraded && def.type !== 'status' && def.type !== 'curse';
    });

    if (upgradeable.length === 0) {
      notify('No cards to upgrade!');
      if (callback) callback();
      return;
    }

    overlay().innerHTML = `
      <div class="overlay-panel" style="max-width:800px">
        <div class="overlay-title">🔨 Upgrade a Card</div>
        <div style="color:#bdc3c7;margin-bottom:12px;text-align:center">Select a card to upgrade permanently.</div>
        <div class="deck-view-cards">
          ${upgradeable.map((c, i) => {
            const def = STS.CARDS[c.id];
            return `<div id="upg-card-${i}" style="cursor:pointer" data-deck-idx="${deck.indexOf(c)}">
              ${cardHtml({id:c.id, def, cost:def.cost, upgraded:false, name:def.name, type:def.type, icon:def.icon||'🃏', desc:def.desc(false)}, true)}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    overlay().classList.add('active');

    upgradeable.forEach((c, i) => {
      const el = document.getElementById(`upg-card-${i}`);
      if (!el) return;
      el.onclick = () => {
        c.upgraded = true;
        closeOverlay();
        notify(`Upgraded: ${STS.CARDS[c.id]?.name}+`);
        if (callback) callback();
      };
    });
  }

  function openRemoveCard(callback) {
    const deck = STS.Game.deck;
    const removeable = deck.filter(c => {
      const def = STS.CARDS[c.id];
      return def && def.rarity !== 'special';
    });

    overlay().innerHTML = `
      <div class="overlay-panel" style="max-width:800px">
        <div class="overlay-title">🗑️ Remove a Card</div>
        <div style="color:#bdc3c7;margin-bottom:12px;text-align:center">Select a card to permanently remove from your deck.</div>
        <div class="deck-view-cards">
          ${removeable.map((c, i) => {
            const def = STS.CARDS[c.id];
            if (!def) return '';
            return `<div id="rem-card-${i}" style="cursor:pointer">
              ${cardHtml({id:c.id, def, cost:def.cost, upgraded:c.upgraded, name: c.upgraded ? def.name+'+' : def.name, type:def.type, icon:def.icon||'🃏', desc:def.desc(c.upgraded)}, true)}
            </div>`;
          }).join('')}
        </div>
      </div>`;
    overlay().classList.add('active');

    removeable.forEach((c, i) => {
      const el = document.getElementById(`rem-card-${i}`);
      if (!el) return;
      el.onclick = () => {
        const idx = deck.indexOf(c);
        if (idx !== -1) deck.splice(idx, 1);
        closeOverlay();
        notify('Card removed.');
        if (callback) callback();
      };
    });
  }

  /* ── Map context (for events/shop outside combat) ── */
  function makeMapCtx() {
    const G = STS.Game;
    return {
      getGold: () => G.gold,
      spendGold: (n) => { G.gold -= n; },
      addGold: (n) => { G.gold += n; },
      getPlayer: () => G.player,
      getPotionCount: () => G.potions.length,
      gainRelicRandom: () => {
        const pool = Object.values(STS.RELICS).filter(r =>
          (r.for === 'all' || r.for === G.character) &&
          !G.relics.includes(r.id) && r.rarity !== 'starter'
        );
        if (pool.length > 0) {
          const r = pool[Math.floor(Math.random() * pool.length)];
          G.addRelic(r.id);
        }
      },
      gainPotionRandom: () => {
        const ids = Object.keys(STS.POTIONS);
        G.addPotion(ids[Math.floor(Math.random() * ids.length)]);
      },
      healHp: (n) => {
        G.player.hp = Math.min(G.player.maxHp, G.player.hp + n);
      },
      loseHpDirect: (n) => {
        G.player.hp = Math.max(1, G.player.hp - n);
      },
      removeCardFromDeck: () => openRemoveCard(() => {}),
      upgradeCardInDeck: () => openUpgradeCard(() => {}),
      addCardToDeck: (id, upg) => G.deck.push({id, upgraded: upg}),
      pickRandomCards: (n, typeFilter, upgraded) => {
        const char = G.character;
        let pool = Object.values(STS.CARDS).filter(c => {
          if (c.rarity === 'special' || c.rarity === 'starter') return false;
          if (c.for !== 'all' && c.for !== char) return false;
          if (typeFilter === 'attack' && c.type !== 'attack') return false;
          if (typeFilter === 'rare' && c.rarity !== 'rare') return false;
          return true;
        });
        const result = [];
        for (let i = 0; i < n && pool.length > 0; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          result.push(pool.splice(idx, 1)[0]);
        }
        return result;
      },
      scheduleEncounter: (ids) => { G.state.pendingEncounter = ids; },
      notify: (msg) => notify(msg)
    };
  }

  /* ══════════════════════════════════════════════
     MAIN RENDER DISPATCHER
  ══════════════════════════════════════════════ */
  function render() {
    const scr = STS.Game.state.screen;

    // Clear overlay for non-overlay screens
    if (!['reward','rest','shop','event','treasure'].includes(scr)) {
      closeOverlay();
    }

    switch (scr) {
      case 'title':     renderTitle(); break;
      case 'charSelect': renderCharSelect(); break;
      case 'map':       renderMap(); break;
      case 'combat':    renderCombat(); break;
      case 'reward':    renderMap(); renderReward(); break;
      case 'rest':      renderMap(); renderRest(); break;
      case 'shop':      renderMap(); renderShop(); break;
      case 'event':     renderMap(); renderEvent(); break;
      case 'treasure':  renderMap(); renderTreasure(); break;
      case 'gameover':  renderGameOver(); break;
      case 'victory':   renderVictory(); break;
    }
  }

  return {
    render,
    notify,
    showDamageText,
    updateCombat,
    openRemoveCard,
    openUpgradeCard,
    openDeckView
  };
})();

/* js/combat.js — Combat engine */
'use strict';
window.STS = window.STS || {};

STS.Combat = (function() {

  /* ── Card Instance ── */
  function makeCard(id, upgraded = false) {
    const def = STS.CARDS[id];
    if (!def) { console.warn('Unknown card:', id); return null; }
    return {
      uid: Math.random().toString(36).slice(2),
      id,
      def,
      upgraded,
      name: upgraded ? def.name + '+' : def.name,
      type: def.type,
      rarity: def.rarity,
      icon: def.icon || '🃏',
      cost: (upgraded && def.upgradedCost !== undefined) ? def.upgradedCost : def.cost,
      desc: def.desc(upgraded),
      exhaust: typeof def.exhaust === 'function' ? def.exhaust(upgraded) : !!def.exhaust,
      ethereal: !!def.ethereal,
      innate: !!def.innate,
      unplayable: !!def.unplayable,
      tempCost: null // randomized cost (snecko eye etc)
    };
  }

  /* ── Enemy Instance ── */
  function makeEnemy(id, extraHp = 0) {
    const def = STS.ENEMIES[id];
    if (!def) { console.warn('Unknown enemy:', id); return null; }
    const hpRange = def.hp;
    const hp = Array.isArray(hpRange)
      ? hpRange[0] + Math.floor(Math.random() * (hpRange[1] - hpRange[0] + 1)) + extraHp
      : hpRange + extraHp;
    const enemy = {
      id,
      def,
      name: def.name,
      icon: def.icon || '👾',
      hp,
      maxHp: hp,
      block: 0,
      statuses: {},
      ai: {},
      intangible: false,
      intent: null,
      dead: false
    };
    if (def.initFn) def.initFn(enemy);
    return enemy;
  }

  /* ── Status helpers ── */
  function getStatus(obj, name) {
    return obj.statuses[name] || 0;
  }
  function setStatus(obj, name, value) {
    if (value <= 0 && !['strength','dexterity'].includes(name)) {
      delete obj.statuses[name];
    } else {
      obj.statuses[name] = value;
    }
  }
  function addStatus(obj, name, amount) {
    setStatus(obj, name, (getStatus(obj, name)) + amount);
  }

  /* ── Damage Calculation ── */
  function calcDmg(baseDmg, attacker, defender, isAttack = true, skipStr = false) {
    let dmg = baseDmg;
    if (isAttack && !skipStr) {
      dmg += getStatus(attacker, 'strength');
    }
    // Weak: attacker deals 25% less
    if (isAttack && getStatus(attacker, 'weak') > 0) {
      dmg = Math.floor(dmg * 0.75);
    }
    // Vulnerable: defender takes 50% more
    if (isAttack && getStatus(defender, 'vulnerable') > 0) {
      dmg = Math.floor(dmg * 1.5);
    }
    // Intangible: take max 1 damage
    if (defender.intangible) dmg = Math.min(1, dmg);
    return Math.max(0, dmg);
  }

  function applyDmgToEntity(dmg, entity, attacker) {
    if (dmg <= 0) return 0;
    // Thorns: deal damage back to attacker
    const thorns = getStatus(entity, 'thorns');
    if (thorns > 0 && attacker) {
      attacker.hp = Math.max(0, attacker.hp - thorns);
    }
    const blockAbsorb = Math.min(entity.block, dmg);
    entity.block -= blockAbsorb;
    const remaining = dmg - blockAbsorb;
    entity.hp = Math.max(0, entity.hp - remaining);
    return remaining; // unblocked damage
  }

  /* ── Combat State ── */
  function create(enemyIds, playerState) {
    const enemies = enemyIds.map((id, idx) => {
      const act = playerState.act || 1;
      const extraHp = (act - 1) * 8;
      return makeEnemy(id, extraHp);
    }).filter(Boolean);

    // Build draw pile from player deck
    const drawPile = playerState.deck.map(c => makeCard(c.id, c.upgraded));
    shuffle(drawPile);

    const state = {
      player: {
        ...playerState,
        block: 0,
        statuses: {},
        hand: [],
        drawPile,
        discardPile: [],
        exhaustPile: [],
        energy: playerState.maxEnergy,
        cardsPlayedThisTurn: 0,
        flags: {}
      },
      enemies,
      turn: 0,
      phase: 'player', // 'player' | 'enemy' | 'end'
      targetIdx: 0,
      log: [],
      pendingAnimation: null,
      onUpdate: null, // callback
      onEnd: null,    // callback(won)
      ended: false,
      notifyFn: null
    };

    // Compute first intents
    enemies.forEach(e => { if (e && !e.dead) e.intent = e.def.intentFn(e); });

    return state;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /* ── Start combat ── */
  function startCombat(state) {
    const ctx = makeCtx(state);

    // Apply relic effects at combat start
    STS.Game.getRelics().forEach(r => {
      if (r.onCombatStart) r.onCombatStart(ctx);
    });

    // Innate cards
    state.player.drawPile.forEach(c => {
      if (c.innate) {
        // Move to front
        const idx = state.player.drawPile.indexOf(c);
        state.player.drawPile.splice(idx, 1);
        state.player.drawPile.unshift(c);
      }
    });

    startPlayerTurn(state);
  }

  /* ── Player Turn ── */
  function startPlayerTurn(state) {
    state.phase = 'player';
    state.turn++;
    const p = state.player;

    // Reset block (unless barricade)
    if (!getStatus(p, 'barricade')) {
      p.block = 0;
    }

    // Reset energy (ice cream preserves remaining; usually restore to max)
    const hasIceCream = STS.Game.hasRelic('ice_cream');
    if (!hasIceCream) {
      p.energy = p.maxEnergy;
    } else {
      p.energy = Math.max(p.energy, p.maxEnergy);
    }

    p.cardsPlayedThisTurn = 0;
    p.flags = {};

    // Clear per-turn statuses — restore any temp-strength first
    const tempStr = getStatus(p, 'temp-strength');
    if (tempStr > 0) {
      addStatus(p, 'strength', tempStr); // restore strength lost from Dark Shackles etc.
    }
    ['entangled', 'rage', 'double-tap', 'burst', 'phantasmal', 'temp-strength'].forEach(s => {
      delete p.statuses[s];
    });

    // Snecko Eye: randomize costs
    if (STS.Game.hasRelic('snecko_eye')) {
      p.drawPile.forEach(c => { c.tempCost = Math.floor(Math.random() * 4); });
      p.hand.forEach(c => { c.tempCost = Math.floor(Math.random() * 4); });
    }

    // Apply next-turn-energy
    const nte = getStatus(p, 'next-turn-energy');
    if (nte > 0) { p.energy += nte; delete p.statuses['next-turn-energy']; }

    // Apply next-turn-draw
    const ntd = getStatus(p, 'next-turn-draw');
    if (ntd > 0) { drawCards(state, ntd); delete p.statuses['next-turn-draw']; }

    // Tools of the Trade
    if (getStatus(p, 'tools') > 0) {
      drawCards(state, 1);
      discardFromHand(state, 1, true); // auto-discard
    }

    // Draw hand
    drawCards(state, 5);

    // Noxious Fumes
    if (getStatus(p, 'noxious-fumes') > 0) {
      const v = getStatus(p, 'noxious-fumes');
      state.enemies.forEach(e => { if (e && !e.dead) addStatus(e, 'poison', v); });
    }

    // Ring of the Snake: extra draw on turn 1
    if (state.turn === 1 && STS.Game.hasRelic('ring_of_snake')) {
      drawCards(state, 2);
    }

    // Philosopher's Stone: gain 1 energy
    if (STS.Game.hasRelic('philosophers_stone')) p.energy++;

    // Fusion Hammer: gain 1 energy
    if (STS.Game.hasRelic('fusion_hammer')) p.energy++;

    // Update enemy intents
    state.enemies.forEach(e => { if (e && !e.dead) e.intent = e.def.intentFn(e); });

    // Stone Calendar
    if (STS.Game.hasRelic('stone_calendar') && state.turn === 7) {
      state.enemies.forEach(e => { if (e && !e.dead) applyDmgToEntity(52, e, null); });
      checkEnemiesDead(state);
    }

    notify(state, null); // refresh UI
  }

  function endPlayerTurn(state) {
    if (state.phase !== 'player' || state.ended) return;
    state.phase = 'enemy';
    const p = state.player;

    // Discard hand — ethereal cards get exhausted
    p.hand.forEach(c => {
      if (c.ethereal) {
        p.exhaustPile.push(c);
        triggerOnExhaust(state, c);
      } else if (!getStatus(p, 'well-laid-plans') || !c.retain) {
        p.discardPile.push(c);
      }
    });
    p.hand = [];

    // Orichalcum: if no block, gain 6
    if (STS.Game.hasRelic('orichalcum') && p.block === 0) p.block += 6;

    // Flex: lose strength
    const flex = getStatus(p, 'flex');
    if (flex > 0) { addStatus(p, 'strength', -flex); delete p.statuses.flex; }

    // Metallicize: gain block
    const metal = getStatus(p, 'metallicize');
    if (metal > 0) p.block += metal;

    // Demon Form: gain strength (happens at start of NEXT turn actually, but apply end of turn for simplicity)
    // Note: In StS it's start of turn. We'll track it.

    // Ritual
    state.enemies.forEach(e => {
      if (!e || e.dead) return;
      const rit = getStatus(e, 'ritual');
      if (rit > 0) addStatus(e, 'strength', rit);
    });

    // Burn cards in hand deal 2 damage each
    let burnDmg = 0;
    p.hand.forEach(c => { if (c.id === 'burn') burnDmg += 2; });
    if (burnDmg > 0) p.hp = Math.max(0, p.hp - burnDmg);

    // Tick turn statuses (vulnerable, weak on player)
    tickStatuses(p);

    // Nil energy carry if not ice cream
    const hasIceCream = STS.Game.hasRelic('ice_cream');
    if (!hasIceCream) p.energy = 0;

    notify(state, null);

    // Enemy turn (with delay for animation)
    setTimeout(() => executeEnemyTurn(state), 300);
  }

  function executeEnemyTurn(state) {
    const enemies = state.enemies.filter(e => e && !e.dead);
    let idx = 0;

    function nextEnemy() {
      if (idx >= enemies.length) {
        afterEnemyTurn(state);
        return;
      }
      const e = enemies[idx++];
      const ctx = makeCtx(state, e);

      // Check if dead (might have died from thorns/poison during turn)
      if (e.dead) { nextEnemy(); return; }

      // Execute AI
      try { e.def.actFn(e, ctx); } catch(err) { console.error('Enemy AI error:', err); }

      // Process poison after enemy acts
      const poison = getStatus(e, 'poison');
      if (poison > 0) {
        e.hp = Math.max(0, e.hp - poison);
        addStatus(e, 'poison', -1);
        if (e.hp <= 0) e.dead = true;
      }

      // Tick enemy statuses
      tickStatuses(e);

      // Check if player died
      if (state.player.hp <= 0) {
        endCombat(state, false);
        return;
      }

      notify(state, null);
      setTimeout(nextEnemy, 200);
    }

    nextEnemy();
  }

  function afterEnemyTurn(state) {
    if (state.ended) return;
    const p = state.player;

    // Poison damage on player
    const pPoison = getStatus(p, 'poison');
    if (pPoison > 0) {
      p.hp = Math.max(0, p.hp - pPoison);
      addStatus(p, 'poison', -1);
    }

    // Burn cards in discard pile deal 2 damage each (burned into discard by hexaghost etc)
    let burnDmg = 0;
    p.discardPile.forEach(c => { if (c.id === 'burn') burnDmg += 2; });
    if (burnDmg > 0) p.hp = Math.max(0, p.hp - burnDmg);

    // Tick statuses
    tickStatuses(p);

    // Demon Form: gain strength at start of next turn
    // (Actually in StS it's start of player turn — we'll do it in startPlayerTurn instead)

    if (p.hp <= 0) { endCombat(state, false); return; }

    checkEnemiesDead(state);
    if (state.ended) return;

    // Update intents
    state.enemies.forEach(e => { if (e && !e.dead) e.intent = e.def.intentFn(e); });

    // Start of new player turn
    if (!state.ended) {
      // Demon Form
      const demonForm = getStatus(p, 'demon-form');
      if (demonForm > 0) addStatus(p, 'strength', demonForm);

      startPlayerTurn(state);
    }
  }

  function tickStatuses(entity) {
    const durational = ['vulnerable', 'weak', 'poison', 'frail', 'entangled', 'intangible-dur'];
    durational.forEach(s => {
      if (entity.statuses[s] > 0) {
        entity.statuses[s]--;
        if (entity.statuses[s] <= 0) delete entity.statuses[s];
      }
    });
  }

  function checkEnemiesDead(state) {
    let allDead = true;
    state.enemies.forEach(e => {
      if (!e || e.dead) return;
      if (e.hp <= 0) {
        e.dead = true;
        e.hp = 0;
        // Gremlin Horn relic
        if (STS.Game.hasRelic('gremlin_horn')) {
          const ctx = makeCtx(state);
          ctx.gainEnergy(1);
          ctx.draw(1);
        }
        // Corpse explosion
        if (getStatus(e, 'corpse-explosion') > 0) {
          const poison = getStatus(e, 'poison');
          state.enemies.forEach(o => {
            if (o && !o.dead && o !== e) {
              applyDmgToEntity(poison * 2, o, null);
              if (o.hp <= 0) o.dead = true;
            }
          });
          state.player.hp = Math.max(0, state.player.hp - poison);
        }
      }
      if (!e.dead) allDead = false;
    });

    if (allDead) {
      endCombat(state, true);
    }
  }

  function endCombat(state, won) {
    if (state.ended) return;
    state.ended = true;
    state.phase = won ? 'won' : 'lost';
    notify(state, null);

    if (won) {
      // Apply relic end-of-combat effects
      const ctx = makeCtx(state);
      STS.Game.getRelics().forEach(r => {
        if (r.onCombatEnd) r.onCombatEnd(ctx);
      });
    }

    setTimeout(() => {
      if (state.onEnd) state.onEnd(won);
    }, won ? 1000 : 500);
  }

  /* ── Drawing ── */
  function drawCards(state, n) {
    const p = state.player;
    if (p.flags.noMoreDraw) return;
    for (let i = 0; i < n; i++) {
      if (p.drawPile.length === 0) {
        if (p.discardPile.length === 0) break;
        p.drawPile = [...p.discardPile];
        p.discardPile = [];
        shuffle(p.drawPile);
      }
      const card = p.drawPile.pop();
      if (!card) break;
      // Add to hand (ethereal cards will be exhausted at end of turn if unplayed)
      p.hand.push(card);
    }
    notify(state, null);
  }

  function discardFromHand(state, n, auto = false) {
    const p = state.player;
    if (auto) {
      // auto-discard: discard last n cards
      const toDiscard = p.hand.splice(p.hand.length - n, n);
      p.discardPile.push(...toDiscard);
    }
    // Otherwise, UI handles the discard selection
  }

  function triggerOnExhaust(state, card) {
    const p = state.player;
    // Feel No Pain
    const fnp = getStatus(p, 'feel-no-pain');
    if (fnp > 0) p.block += fnp;
    // Fire Breathing
    const fb = getStatus(p, 'fire-breathing');
    if (fb > 0 && (card.type === 'status' || card.type === 'curse')) {
      state.enemies.forEach(e => { if (e && !e.dead) applyDmgToEntity(fb, e, p); });
    }
    // Evolve
    const evolve = getStatus(p, 'evolve');
    if (evolve > 0 && (card.type === 'status' || card.type === 'curse')) {
      drawCards(state, evolve);
    }
    notify(state, null);
  }

  /* ── Play a Card ── */
  function playCard(state, handIdx, targetIdx) {
    if (state.phase !== 'player' || state.ended) return false;
    const p = state.player;
    const card = p.hand[handIdx];
    if (!card) return false;
    if (card.unplayable) return false;

    const cardCost = card.tempCost !== null ? card.tempCost : card.cost;

    // Corruption: skills cost 0
    if (card.type === 'skill' && getStatus(p, 'corruption') > 0) {
      // cost = 0, will exhaust
    }

    // X-cost: uses all remaining energy
    let energyCost = cardCost;
    if (cardCost === 'X') energyCost = 0; // X cards drain via ctx.spendEnergy inside play fn

    // Check entangled (can't play attacks)
    if (card.type === 'attack' && getStatus(p, 'entangled') > 0) return false;

    // Check energy
    const actualCost = (card.type === 'skill' && getStatus(p, 'corruption') > 0) ? 0 : energyCost;
    if (p.energy < actualCost) return false;

    // Remove from hand
    p.hand.splice(handIdx, 1);
    p.energy -= actualCost;

    // Bonus damage from relics (Akabeko, Pen Nib)
    let bonusDamage = p.flags.bonusDamage || 0;
    let doubleDamage = !!p.flags.doubleDamage;
    delete p.flags.bonusDamage;
    delete p.flags.doubleDamage;

    // Phantasmal Killer: double next attack's damage
    if (card.type === 'attack' && getStatus(p, 'phantasmal') > 0) {
      doubleDamage = true;
      addStatus(p, 'phantasmal', -1);
      if (getStatus(p, 'phantasmal') <= 0) delete p.statuses.phantasmal;
    }

    // Build context
    const ctx = makeCtx(state, null, card, bonusDamage, doubleDamage);

    // Burst / Double Tap tracking
    let playCount = 1;
    if (card.type === 'skill' && getStatus(p, 'burst') > 0) {
      playCount++;
      addStatus(p, 'burst', -1);
    }
    if (card.type === 'attack' && getStatus(p, 'double-tap') > 0) {
      playCount++;
      addStatus(p, 'double-tap', -1);
    }

    // Execute card
    for (let t = 0; t < playCount; t++) {
      try { card.def.play(ctx, card, targetIdx); } catch(err) { console.error('Card play error:', err, card.id); }
    }

    // Rage: gain block on attack
    if (card.type === 'attack') {
      const rage = getStatus(p, 'rage');
      if (rage > 0) p.block += rage;
    }

    // Corruption: exhaust skills
    const isCorruptionSkill = card.type === 'skill' && getStatus(p, 'corruption') > 0;

    // Exhaust or discard
    if (card.exhaust || isCorruptionSkill) {
      p.exhaustPile.push(card);
      triggerOnExhaust(state, card);
    } else {
      p.discardPile.push(card);
    }

    p.cardsPlayedThisTurn++;

    // Relic card-play effects
    STS.Game.getRelics().forEach(r => {
      if (r.onCardPlay) r.onCardPlay(makeCtx(state), card);
    });

    checkEnemiesDead(state);
    if (!state.ended) notify(state, null);
    return true;
  }

  /* ── Context (API passed to card play fns and AI) ── */
  function makeCtx(state, currentEnemy, currentCard, bonusDamage = 0, doubleDamage = false) {
    const p = state.player;

    const getEnemy = (ti) => {
      if (ti === 'player') return p;
      const alive = state.enemies.filter(e => e && !e.dead);
      if (typeof ti === 'number') return alive[ti] || alive[0];
      return alive[0];
    };

    return {
      // ── Player actions ──
      attack(ti, baseDmg, skipStr = false) {
        const target = getEnemy(ti);
        if (!target || target.dead) return 0;
        let dmg = calcDmg(baseDmg + bonusDamage, p, target, true, skipStr);
        if (doubleDamage) { dmg *= 2; doubleDamage = false; }
        const unblocked = applyDmgToEntity(dmg, target, p);
        // Check dead
        if (target.hp <= 0) target.dead = true;
        showDmgText(dmg, target);
        return unblocked;
      },
      attackAll(baseDmg) {
        state.enemies.forEach((e, i) => {
          if (!e || e.dead) return;
          let dmg = calcDmg(baseDmg + bonusDamage, p, e, true, false);
          if (doubleDamage) dmg *= 2;
          applyDmgToEntity(dmg, e, p);
          if (e.hp <= 0) e.dead = true;
          showDmgText(dmg, e);
        });
        doubleDamage = false;
      },
      attackKill(ti, baseDmg) {
        const target = getEnemy(ti);
        if (!target || target.dead) return false;
        const dmg = calcDmg(baseDmg + bonusDamage, p, target);
        applyDmgToEntity(dmg, target, p);
        showDmgText(dmg, target);
        if (target.hp <= 0) { target.dead = true; return true; }
        return false;
      },
      attackPotion(ti, baseDmg) {
        const target = getEnemy(ti);
        if (!target || target.dead) return;
        const dmg = baseDmg;
        applyDmgToEntity(dmg, target, null);
        if (target.hp <= 0) target.dead = true;
        showDmgText(dmg, target);
        checkEnemiesDead(state);
      },
      reaper(baseDmg) {
        let totalUnblocked = 0;
        state.enemies.forEach(e => {
          if (!e || e.dead) return;
          const dmg = calcDmg(baseDmg, p, e);
          const unblocked = applyDmgToEntity(dmg, e, p);
          totalUnblocked += unblocked;
          if (e.hp <= 0) e.dead = true;
          showDmgText(dmg, e);
        });
        if (totalUnblocked > 0) {
          p.hp = Math.min(p.maxHp, p.hp + totalUnblocked);
          showHealText(totalUnblocked);
        }
      },
      block(amount) {
        let b = amount + getStatus(p, 'dexterity');
        if (getStatus(p, 'frail') > 0) b = Math.floor(b * 0.75);
        b = Math.max(0, b);
        p.block += b;
        // Juggernaut: deal damage on block gain
        const jug = getStatus(p, 'juggernaut');
        if (jug > 0 && b > 0) {
          const alive = state.enemies.filter(e => e && !e.dead);
          if (alive.length > 0) {
            const t = alive[Math.floor(Math.random() * alive.length)];
            applyDmgToEntity(jug, t, p);
            if (t.hp <= 0) t.dead = true;
          }
        }
      },
      status(target, name, amount) {
        if (target === 'player') {
          // Check artifact
          if (amount < 0 || ['vulnerable','weak','frail','entangled','poison','strength'].includes(name) && amount < 0) {
            const art = getStatus(p, 'artifact');
            if (art > 0 && amount < 0) { addStatus(p, 'artifact', -1); return; }
          }
          addStatus(p, name, amount);
          if (name === 'strength' && p.statuses.strength === 0) delete p.statuses.strength;
        } else {
          const e = getEnemy(target);
          if (!e || e.dead) return;
          const art = getStatus(e, 'artifact');
          if (art > 0 && amount < 0) { addStatus(e, 'artifact', -1); return; }
          addStatus(e, name, amount);
        }
      },
      setStatus(target, name, value) {
        if (target === 'player') p.statuses[name] = value;
        else { const e = getEnemy(target); if (e) e.statuses[name] = value; }
      },
      statusAll(name, amount) {
        state.enemies.forEach(e => { if (e && !e.dead) addStatus(e, name, amount); });
      },
      statusPlayer(name, amount) {
        addStatus(p, name, amount);
      },
      draw(n) { drawCards(state, n); },
      gainEnergy(n) { p.energy += n; },
      spendEnergy(n) { p.energy = Math.max(0, p.energy - n); },
      getEnergy() { return p.energy; },
      loseHp(n) {
        p.hp = Math.max(0, p.hp - n);
        // Rupture: gain strength from HP loss from cards
        const rupt = getStatus(p, 'rupture');
        if (rupt > 0) addStatus(p, 'strength', rupt);
        if (p.hp <= 0) endCombat(state, false);
      },
      healHp(n) { p.hp = Math.min(p.maxHp, p.hp + n); showHealText(n); },
      gainMaxHp(n) {
        p.maxHp += n;
        p.hp = Math.min(p.maxHp, p.hp + n);
        STS.Game.playerMaxHp = p.maxHp;
      },
      loseHpDirect(n) {
        p.hp = Math.max(0, p.hp - n);
        if (p.hp <= 0) endCombat(state, false);
      },
      addCard(id, location, upgraded) {
        const c = makeCard(id, upgraded);
        if (!c) return;
        if (location === 'hand') p.hand.push(c);
        else if (location === 'discard') p.discardPile.push(c);
        else if (location === 'draw') { p.drawPile.unshift(c); }
      },
      addCardToDiscard(id, upgraded) {
        const c = makeCard(id, upgraded);
        if (c) p.discardPile.push(c);
      },
      addBurnsToPlayer(n) {
        for (let i = 0; i < n; i++) {
          const c = makeCard('burn', false);
          if (c) p.discardPile.push(c);
        }
        notify(state, null);
      },
      recycleTopDiscard() {
        if (p.discardPile.length > 0) {
          const c = p.discardPile.pop();
          p.drawPile.push(c);
        }
      },
      exhaustCard(card) {
        const idx = p.hand.indexOf(card);
        if (idx !== -1) p.hand.splice(idx, 1);
        p.exhaustPile.push(card);
        triggerOnExhaust(state, card);
      },
      exhaustNonAttacks() {
        const nonAttacks = p.hand.filter(c => c.type !== 'attack');
        nonAttacks.forEach(c => {
          const idx = p.hand.indexOf(c);
          if (idx !== -1) p.hand.splice(idx, 1);
          p.exhaustPile.push(c);
          triggerOnExhaust(state, c);
        });
        return nonAttacks.length;
      },
      discardFromHand(n) {
        // Trigger UI selection if not auto
        state.pendingDiscard = n;
        notify(state, 'discard');
      },
      getStatus(target, name) {
        if (target === 'player') return getStatus(p, name);
        const e = getEnemy(target);
        return e ? getStatus(e, name) : 0;
      },
      setFlag(name, value) { p.flags[name] = value; },
      getFlag(name) { return p.flags[name]; },
      getPlayer() { return p; },
      getPlayerBlock() { return p.block; },
      getCombatTurn() { return state.turn; },
      getEnemies() { return state.enemies.filter(e => e && !e.dead); },

      // Upgrade in hand
      upgradeAllInHand() {
        p.hand.forEach(c => {
          if (!c.upgraded && c.def.upgradedValues) {
            c.upgraded = true;
            c.name = c.def.name + '+';
            c.cost = c.def.upgradedCost !== undefined ? c.def.upgradedCost : c.def.cost;
            c.desc = c.def.desc(true);
          }
        });
      },
      upgradeOneInHand() {
        state.pendingUpgradeHand = true;
        notify(state, 'upgradeHand');
      },

      // Strom of Steel
      stormOfSteel(shivsPerCard) {
        const count = p.hand.length;
        const discarded = [...p.hand];
        p.hand = [];
        discarded.forEach(c => p.discardPile.push(c));
        for (let i = 0; i < count * shivsPerCard; i++) {
          const shiv = makeCard('shiv', false);
          if (shiv) p.hand.push(shiv);
        }
      },

      // Whirlwind energy
      spendEnergy(n) { p.energy = Math.max(0, p.energy - n); },

      // Enemy combat actions (used by enemy AI)
      enemyAttack(enemy, baseDmg) {
        if (!enemy || enemy.dead) return;
        const dmg = calcDmg(baseDmg, enemy, p, true, false);
        const unblocked = applyDmgToEntity(dmg, p, enemy);
        showPlayerDmgText(dmg);
        // Caltrops
        const caltrops = getStatus(p, 'caltrops');
        if (caltrops > 0 && dmg > 0) addStatus(enemy, 'weak', caltrops);
        // Centennial Puzzle
        if (unblocked > 0) {
          STS.Game.getRelics().forEach(r => {
            if (r.onTakeDamage) r.onTakeDamage(makeCtx(state), unblocked);
          });
        }
        if (p.hp <= 0) {
          // Check Lizard Tail
          let saved = false;
          STS.Game.getRelics().forEach(r => {
            if (r.onWouldDie && !saved) {
              const did = r.onWouldDie(makeCtx(state));
              if (did) saved = true;
            }
          });
          if (!saved) endCombat(state, false);
        }
      },
      enemyGainBlock(enemy, amount) {
        if (!enemy || enemy.dead) return;
        enemy.block += amount;
      },
      enemyStatus(enemy, name, amount) {
        if (!enemy || enemy.dead) return;
        addStatus(enemy, name, amount);
      },
      enemySetIntangible(enemy, val) {
        if (!enemy) return;
        enemy.intangible = val;
      },
      buffAllEnemies(name, amount) {
        state.enemies.forEach(e => { if (e && !e.dead) addStatus(e, name, amount); });
      },
      dealDamageToEnemy(amount, target) {
        if (target === 'all') {
          state.enemies.forEach(e => {
            if (!e || e.dead) return;
            applyDmgToEntity(amount, e, null);
            if (e.hp <= 0) e.dead = true;
          });
        } else {
          const e = getEnemy(target);
          if (e && !e.dead) {
            applyDmgToEntity(amount, e, null);
            if (e.hp <= 0) e.dead = true;
          }
        }
        checkEnemiesDead(state);
      },
      spawnSplitSlimes(boss) {
        boss.dead = true;
        const s1 = makeEnemy('small_slime', 0);
        const s2 = makeEnemy('small_slime', 0);
        const hp = Math.floor(boss.maxHp * 0.5);
        if (s1) { s1.hp = hp; s1.maxHp = hp; state.enemies.push(s1); }
        if (s2) { s2.hp = hp; s2.maxHp = hp; state.enemies.push(s2); }
        // Update intents
        state.enemies.forEach(e => { if (e && !e.dead) e.intent = e.def.intentFn(e); });
        notify(state, null);
      },
      spawnGremlins(boss, count) {
        for (let i = 0; i < count; i++) {
          const g = makeEnemy('gremlin_mad', 0);
          if (g) state.enemies.push(g);
        }
        state.enemies.forEach(e => { if (e && !e.dead) e.intent = e.def.intentFn(e); });
        notify(state, null);
      },
      addCardToDiscard(id, upgraded) {
        const c = makeCard(id, upgraded);
        if (c) p.discardPile.push(c);
        notify(state, null);
      },

      // Nilry's Codex
      nilryChoice() { /* handled by UI */ },

      // Snecko Eye
      randomizeHandCosts() {
        p.hand.forEach(c => { c.tempCost = Math.floor(Math.random() * 4); });
      },

      notify(msg) { notify(state, msg); },

      // Map context
      getGold() { return STS.Game.gold; },
      spendGold(n) { STS.Game.gold -= n; },
      addGold(n) { STS.Game.gold += n; },
      getPotionCount() { return STS.Game.potions.length; },
      gainRelicRandom() {
        const pool = Object.values(STS.RELICS).filter(r =>
          (r.for === 'all' || r.for === STS.Game.character) &&
          !STS.Game.hasRelic(r.id) &&
          r.rarity !== 'starter' && r.rarity !== 'boss'
        );
        if (pool.length === 0) return;
        const relic = pool[Math.floor(Math.random() * pool.length)];
        STS.Game.addRelic(relic.id);
      },
      gainPotionRandom() {
        const ids = Object.keys(STS.POTIONS);
        const id = ids[Math.floor(Math.random() * ids.length)];
        STS.Game.addPotion(id);
      },
      removeRelic(id) { STS.Game.removeRelic(id); },
      removeCardFromDeck() {
        // Trigger UI
        STS.UI.openRemoveCard(() => {});
      },
      upgradeCardInDeck() {
        STS.UI.openUpgradeCard(() => {});
      },
      loseHpDirect(n) {
        STS.Game.player.hp = Math.max(0, STS.Game.player.hp - n);
        notify(state, null);
      },
      scheduleEncounter(ids) { STS.Game.pendingEncounter = ids; },
      addCardToDeck(id, upgraded) { STS.Game.deck.push({id, upgraded}); },
      pickRandomCards(n, typeFilter, upgraded) {
        let pool = Object.values(STS.CARDS).filter(c => {
          if (c.rarity === 'special' || c.rarity === 'starter') return false;
          if (c.for !== 'all' && c.for !== STS.Game.character) return false;
          if (typeFilter === 'attack' && c.type !== 'attack') return false;
          if (typeFilter === 'rare' && c.rarity !== 'rare') return false;
          if (typeFilter === 'all') return true;
          return true;
        });
        const result = [];
        for (let i = 0; i < n && pool.length > 0; i++) {
          const idx = Math.floor(Math.random() * pool.length);
          result.push(pool[idx]);
          pool.splice(idx, 1);
        }
        return result;
      }
    };
  }

  /* ── Enemy context (subset) ── */
  // Already included in makeCtx

  function notify(state, event) {
    if (state.onUpdate) state.onUpdate(event);
  }

  function showDmgText(dmg, target) {
    if (!target || !target._el) return;
    STS.UI.showDamageText(dmg, target._el, 'dmg');
  }
  function showPlayerDmgText(dmg) {
    STS.UI.showDamageText(dmg, document.getElementById('player-area'), 'dmg');
  }
  function showHealText(n) {
    STS.UI.showDamageText(n, document.getElementById('player-area'), 'heal');
  }

  return { create, startCombat, playCard, endPlayerTurn, makeCard };
})();

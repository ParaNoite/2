/* js/data.js — All game data: cards, enemies, relics, events, potions */
/* Model: Claude Sonnet 4.5 by Anthropic */

'use strict';
window.STS = window.STS || {};

/* ============================================================
   CARDS
   Each card has:
     id, name, type ('attack'|'skill'|'power'|'status'|'curse')
     cost (number or 'X')
     rarity ('starter'|'common'|'uncommon'|'rare'|'colorless')
     for ('ironclad'|'silent'|'all')
     icon (emoji)
     desc(upgraded) → string
     play(ctx, card, targetIdx) → void
     optional: exhaust, ethereal, innate, retain
     optional: upgradedCost
============================================================ */
STS.CARDS = {

  /* ——— SHARED ——— */
  strike: {
    id:'strike', name:'Strike', type:'attack', rarity:'starter', for:'all',
    cost:1, icon:'⚔️',
    desc: u => `Deal ${u?9:6} damage.`,
    play(ctx, card, ti) { ctx.attack(ti, card.upgraded ? 9 : 6); }
  },
  defend: {
    id:'defend', name:'Defend', type:'skill', rarity:'starter', for:'all',
    cost:1, icon:'🛡️',
    desc: u => `Gain ${u?8:5} Block.`,
    play(ctx, card) { ctx.block(card.upgraded ? 8 : 5); }
  },

  /* ——— IRONCLAD CARDS ——— */
  bash: {
    id:'bash', name:'Bash', type:'attack', rarity:'starter', for:'ironclad',
    cost:2, icon:'🔨',
    desc: u => `Deal ${u?10:8} damage. Apply ${u?3:2} Vulnerable.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 10 : 8);
      ctx.status(ti, 'vulnerable', card.upgraded ? 3 : 2);
    }
  },
  anger: {
    id:'anger', name:'Anger', type:'attack', rarity:'common', for:'ironclad',
    cost:0, icon:'😡',
    desc: u => `Deal ${u?8:6} damage. Add a copy of this card to your discard pile.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 8 : 6);
      ctx.addCard('anger', 'discard', card.upgraded);
    }
  },
  cleave: {
    id:'cleave', name:'Cleave', type:'attack', rarity:'common', for:'ironclad',
    cost:1, icon:'🌀',
    desc: u => `Deal ${u?11:8} damage to ALL enemies.`,
    play(ctx, card) { ctx.attackAll(card.upgraded ? 11 : 8); }
  },
  clothesline: {
    id:'clothesline', name:'Clothesline', type:'attack', rarity:'common', for:'ironclad',
    cost:2, icon:'👊',
    desc: u => `Deal ${u?14:12} damage. Apply ${u?3:2} Weak.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 14 : 12);
      ctx.status(ti, 'weak', card.upgraded ? 3 : 2);
    }
  },
  pommel_strike: {
    id:'pommel_strike', name:'Pommel Strike', type:'attack', rarity:'common', for:'ironclad',
    cost:1, icon:'🔱',
    desc: u => `Deal ${u?10:9} damage. Draw ${u?2:1} card(s).`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 10 : 9);
      ctx.draw(card.upgraded ? 2 : 1);
    }
  },
  shrug_it_off: {
    id:'shrug_it_off', name:'Shrug It Off', type:'skill', rarity:'common', for:'ironclad',
    cost:1, icon:'💪',
    desc: u => `Gain ${u?11:8} Block. Draw 1 card.`,
    play(ctx, card) {
      ctx.block(card.upgraded ? 11 : 8);
      ctx.draw(1);
    }
  },
  headbutt: {
    id:'headbutt', name:'Headbutt', type:'attack', rarity:'common', for:'ironclad',
    cost:1, icon:'🤕',
    desc: u => `Deal ${u?12:9} damage. Put the top card of your discard pile on top of your draw pile.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 12 : 9);
      ctx.recycleTopDiscard();
    }
  },
  flex: {
    id:'flex', name:'Flex', type:'skill', rarity:'common', for:'ironclad',
    cost:0, icon:'💪',
    desc: u => `Gain ${u?4:2} Strength. At end of turn, lose ${u?4:2} Strength.`,
    play(ctx, card) {
      const v = card.upgraded ? 4 : 2;
      ctx.status('player', 'strength', v);
      ctx.status('player', 'flex', v);
    }
  },
  inflame: {
    id:'inflame', name:'Inflame', type:'power', rarity:'common', for:'ironclad',
    cost:1, icon:'🔥',
    desc: u => `Gain ${u?3:2} Strength.`,
    play(ctx, card) { ctx.status('player', 'strength', card.upgraded ? 3 : 2); }
  },
  iron_wave: {
    id:'iron_wave', name:'Iron Wave', type:'attack', rarity:'common', for:'ironclad',
    cost:1, icon:'🌊',
    desc: u => `Gain ${u?7:5} Block. Deal ${u?7:5} damage.`,
    play(ctx, card, ti) {
      ctx.block(card.upgraded ? 7 : 5);
      ctx.attack(ti, card.upgraded ? 7 : 5);
    }
  },
  twin_strike: {
    id:'twin_strike', name:'Twin Strike', type:'attack', rarity:'common', for:'ironclad',
    cost:1, icon:'⚡',
    desc: u => `Deal ${u?7:5} damage twice.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 7 : 5);
      ctx.attack(ti, card.upgraded ? 7 : 5);
    }
  },
  wild_strike: {
    id:'wild_strike', name:'Wild Strike', type:'attack', rarity:'common', for:'ironclad',
    cost:1, icon:'🌪️',
    desc: u => `Deal ${u?17:12} damage. Shuffle a Wound into your draw pile.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 17 : 12);
      ctx.addCard('wound', 'draw', false);
    }
  },
  armaments: {
    id:'armaments', name:'Armaments', type:'skill', rarity:'common', for:'ironclad',
    cost:1, icon:'⚙️',
    desc: u => `Gain 5 Block. ${u ? 'Upgrade ALL cards in your hand.' : 'Upgrade a card in your hand.'}`,
    play(ctx, card) {
      ctx.block(5);
      if (card.upgraded) ctx.upgradeAllInHand();
      else ctx.upgradeOneInHand();
    }
  },
  battle_trance: {
    id:'battle_trance', name:'Battle Trance', type:'skill', rarity:'uncommon', for:'ironclad',
    cost:0, icon:'🌀',
    desc: u => `Draw ${u?4:3} cards. You cannot draw additional cards this turn.`,
    play(ctx, card) {
      ctx.draw(card.upgraded ? 4 : 3);
      ctx.setFlag('noMoreDraw', true);
    }
  },
  disarm: {
    id:'disarm', name:'Disarm', type:'skill', rarity:'uncommon', for:'ironclad',
    cost:1, icon:'🔓', exhaust:true,
    desc: u => `Enemy loses ${u?3:2} Strength. Exhaust.`,
    play(ctx, card, ti) { ctx.status(ti, 'strength', -(card.upgraded ? 3 : 2)); }
  },
  carnage: {
    id:'carnage', name:'Carnage', type:'attack', rarity:'uncommon', for:'ironclad',
    cost:2, icon:'💢', ethereal:true,
    desc: u => `Deal ${u?28:20} damage. Ethereal.`,
    play(ctx, card, ti) { ctx.attack(ti, card.upgraded ? 28 : 20); }
  },
  feel_no_pain: {
    id:'feel_no_pain', name:'Feel No Pain', type:'power', rarity:'uncommon', for:'ironclad',
    cost:1, icon:'❄️',
    desc: u => `Whenever a card is Exhausted, gain ${u?4:3} Block.`,
    play(ctx, card) { ctx.status('player', 'feel-no-pain', card.upgraded ? 4 : 3); }
  },
  heavy_blade: {
    id:'heavy_blade', name:'Heavy Blade', type:'attack', rarity:'uncommon', for:'ironclad',
    cost:2, icon:'🪓',
    desc: u => `Deal 14 damage. Strength affects this card ${u?5:3}X.`,
    play(ctx, card, ti) {
      const mult = card.upgraded ? 5 : 3;
      const str = ctx.getStatus('player', 'strength') || 0;
      // 14 + str*(mult-1) so that calcDmg adds str once more = 14 + str*mult total
      ctx.attack(ti, 14 + str * (mult - 1));
    }
  },
  metallicize: {
    id:'metallicize', name:'Metallicize', type:'power', rarity:'uncommon', for:'ironclad',
    cost:1, icon:'🔩',
    desc: u => `At the end of your turn, gain ${u?4:3} Block.`,
    play(ctx, card) { ctx.status('player', 'metallicize', card.upgraded ? 4 : 3); }
  },
  pummel: {
    id:'pummel', name:'Pummel', type:'attack', rarity:'uncommon', for:'ironclad',
    cost:1, icon:'👊', exhaust:true,
    desc: u => `Deal 2 damage ${u?5:4} times. Exhaust.`,
    play(ctx, card, ti) {
      const times = card.upgraded ? 5 : 4;
      for (let i = 0; i < times; i++) ctx.attack(ti, 2);
    }
  },
  shockwave: {
    id:'shockwave', name:'Shockwave', type:'skill', rarity:'uncommon', for:'ironclad',
    cost:2, icon:'💥', exhaust:true,
    desc: u => `Apply ${u?5:3} Weak and ${u?5:3} Vulnerable to ALL enemies. Exhaust.`,
    play(ctx, card) {
      const v = card.upgraded ? 5 : 3;
      ctx.statusAll('vulnerable', v);
      ctx.statusAll('weak', v);
    }
  },
  uppercut: {
    id:'uppercut', name:'Uppercut', type:'attack', rarity:'uncommon', for:'ironclad',
    cost:2, icon:'🥊',
    desc: u => `Deal 13 damage. Apply ${u?2:1} Weak and ${u?2:1} Vulnerable.`,
    play(ctx, card, ti) {
      ctx.attack(ti, 13);
      const v = card.upgraded ? 2 : 1;
      ctx.status(ti, 'weak', v);
      ctx.status(ti, 'vulnerable', v);
    }
  },
  whirlwind: {
    id:'whirlwind', name:'Whirlwind', type:'attack', rarity:'uncommon', for:'ironclad',
    cost:'X', icon:'🌪️',
    desc: u => `Deal ${u?8:5} damage to ALL enemies X times.`,
    play(ctx, card) {
      const dmg = card.upgraded ? 8 : 5;
      const energy = ctx.getEnergy();
      for (let i = 0; i < energy; i++) ctx.attackAll(dmg);
      ctx.spendEnergy(energy);
    }
  },
  second_wind: {
    id:'second_wind', name:'Second Wind', type:'skill', rarity:'uncommon', for:'ironclad',
    cost:1, icon:'💨',
    desc: u => `Exhaust all non-Attack cards in your hand. Gain ${u?7:5} Block for each.`,
    play(ctx, card) {
      const count = ctx.exhaustNonAttacks();
      ctx.block((card.upgraded ? 7 : 5) * count);
    }
  },
  rage: {
    id:'rage', name:'Rage', type:'skill', rarity:'uncommon', for:'ironclad',
    cost:0, icon:'😤',
    desc: u => `Whenever you play an Attack this turn, gain ${u?5:3} Block.`,
    play(ctx, card) { ctx.status('player', 'rage', card.upgraded ? 5 : 3); }
  },
  rupture: {
    id:'rupture', name:'Rupture', type:'power', rarity:'uncommon', for:'ironclad',
    cost:1, icon:'💔',
    desc: u => `Whenever you lose HP from a card effect, gain ${u?2:1} Strength.`,
    play(ctx, card) { ctx.status('player', 'rupture', card.upgraded ? 2 : 1); }
  },
  barricade: {
    id:'barricade', name:'Barricade', type:'power', rarity:'rare', for:'ironclad',
    cost:3, icon:'🏰', upgradedCost:2,
    desc: u => `Block is no longer removed at the start of your turn.`,
    play(ctx) { ctx.status('player', 'barricade', 1); }
  },
  bludgeon: {
    id:'bludgeon', name:'Bludgeon', type:'attack', rarity:'rare', for:'ironclad',
    cost:3, icon:'🪨',
    desc: u => `Deal ${u?42:32} damage.`,
    play(ctx, card, ti) { ctx.attack(ti, card.upgraded ? 42 : 32); }
  },
  demon_form: {
    id:'demon_form', name:'Demon Form', type:'power', rarity:'rare', for:'ironclad',
    cost:3, icon:'😈',
    desc: u => `At the start of each turn, gain ${u?3:2} Strength.`,
    play(ctx, card) { ctx.status('player', 'demon-form', card.upgraded ? 3 : 2); }
  },
  double_tap: {
    id:'double_tap', name:'Double Tap', type:'skill', rarity:'rare', for:'ironclad',
    cost:1, icon:'⚡',
    desc: u => `This turn, your next ${u?2:1} Attack(s) are played twice.`,
    play(ctx, card) { ctx.status('player', 'double-tap', card.upgraded ? 2 : 1); }
  },
  feed: {
    id:'feed', name:'Feed', type:'attack', rarity:'rare', for:'ironclad',
    cost:1, icon:'🍖', exhaust:true,
    desc: u => `Deal ${u?12:10} damage. If this kills the enemy, gain ${u?4:3} Max HP. Exhaust.`,
    play(ctx, card, ti) {
      const killed = ctx.attackKill(ti, card.upgraded ? 12 : 10);
      if (killed) ctx.gainMaxHp(card.upgraded ? 4 : 3);
    }
  },
  impervious: {
    id:'impervious', name:'Impervious', type:'skill', rarity:'rare', for:'ironclad',
    cost:2, icon:'🛡️', exhaust:true,
    desc: u => `Gain ${u?40:30} Block. Exhaust.`,
    play(ctx, card) { ctx.block(card.upgraded ? 40 : 30); }
  },
  limit_break: {
    id:'limit_break', name:'Limit Break', type:'skill', rarity:'rare', for:'ironclad',
    cost:1, icon:'💥', exhaust:true,
    desc: u => `Double your Strength.${u ? '' : ' Exhaust.'}`,
    exhaust: u => !u,
    play(ctx, card) {
      const str = ctx.getStatus('player', 'strength') || 0;
      ctx.status('player', 'strength', str);
    }
  },
  offering: {
    id:'offering', name:'Offering', type:'skill', rarity:'rare', for:'ironclad',
    cost:0, icon:'🩸', exhaust:true,
    desc: u => `Lose 6 HP. Gain 2 Energy. Draw ${u?5:3} cards. Exhaust.`,
    play(ctx, card) {
      ctx.loseHp(6);
      ctx.gainEnergy(2);
      ctx.draw(card.upgraded ? 5 : 3);
    }
  },
  reaper: {
    id:'reaper', name:'Reaper', type:'attack', rarity:'rare', for:'ironclad',
    cost:2, icon:'☠️',
    desc: u => `Deal ${u?5:4} damage to ALL enemies. Heal HP equal to unblocked damage dealt.`,
    play(ctx, card) { ctx.reaper(card.upgraded ? 5 : 4); }
  },
  juggernaut: {
    id:'juggernaut', name:'Juggernaut', type:'power', rarity:'rare', for:'ironclad',
    cost:2, icon:'🪨',
    desc: u => `Whenever you gain Block, deal ${u?7:5} damage to a random enemy.`,
    play(ctx, card) { ctx.status('player', 'juggernaut', card.upgraded ? 7 : 5); }
  },

  /* ——— SILENT CARDS ——— */
  survivor: {
    id:'survivor', name:'Survivor', type:'skill', rarity:'starter', for:'silent',
    cost:1, icon:'🌿',
    desc: u => `Gain ${u?11:8} Block. Discard a card.`,
    play(ctx, card) {
      ctx.block(card.upgraded ? 11 : 8);
      ctx.discardFromHand(1);
    }
  },
  neutralize: {
    id:'neutralize', name:'Neutralize', type:'attack', rarity:'starter', for:'silent',
    cost:0, icon:'🗡️',
    desc: u => `Deal ${u?4:3} damage. Apply ${u?2:1} Weak.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 4 : 3);
      ctx.status(ti, 'weak', card.upgraded ? 2 : 1);
    }
  },
  shiv: {
    id:'shiv', name:'Shiv', type:'attack', rarity:'special', for:'silent',
    cost:0, icon:'🔪', exhaust:true,
    desc: u => `Deal ${u?6:4} damage. Exhaust.`,
    play(ctx, card, ti) { ctx.attack(ti, card.upgraded ? 6 : 4); }
  },
  deadly_poison: {
    id:'deadly_poison', name:'Deadly Poison', type:'skill', rarity:'common', for:'silent',
    cost:1, icon:'☠️',
    desc: u => `Apply ${u?7:5} Poison.`,
    play(ctx, card, ti) { ctx.status(ti, 'poison', card.upgraded ? 7 : 5); }
  },
  flying_knee: {
    id:'flying_knee', name:'Flying Knee', type:'attack', rarity:'common', for:'silent',
    cost:1, icon:'🦵',
    desc: u => `Deal ${u?10:8} damage. Next turn, gain 1 Energy.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 10 : 8);
      ctx.status('player', 'next-turn-energy', 1);
    }
  },
  blade_dance: {
    id:'blade_dance', name:'Blade Dance', type:'skill', rarity:'common', for:'silent',
    cost:1, icon:'💃',
    desc: u => `Add ${u?4:3} Shivs to your hand.`,
    play(ctx, card) {
      const n = card.upgraded ? 4 : 3;
      for (let i = 0; i < n; i++) ctx.addCard('shiv', 'hand', false);
    }
  },
  slice: {
    id:'slice', name:'Slice', type:'attack', rarity:'common', for:'silent',
    cost:0, icon:'✂️',
    desc: u => `Deal ${u?9:6} damage.`,
    play(ctx, card, ti) { ctx.attack(ti, card.upgraded ? 9 : 6); }
  },
  quick_slash: {
    id:'quick_slash', name:'Quick Slash', type:'attack', rarity:'common', for:'silent',
    cost:1, icon:'⚡',
    desc: u => `Deal ${u?12:8} damage. Draw 1 card.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 12 : 8);
      ctx.draw(1);
    }
  },
  sucker_punch: {
    id:'sucker_punch', name:'Sucker Punch', type:'attack', rarity:'common', for:'silent',
    cost:1, icon:'👊',
    desc: u => `Deal ${u?9:7} damage. Apply ${u?2:1} Weak.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 9 : 7);
      ctx.status(ti, 'weak', card.upgraded ? 2 : 1);
    }
  },
  acrobatics: {
    id:'acrobatics', name:'Acrobatics', type:'skill', rarity:'common', for:'silent',
    cost:1, icon:'🤸',
    desc: u => `Draw ${u?3:3} cards. Discard 1 card.`,
    play(ctx, card) {
      ctx.draw(card.upgraded ? 4 : 3);
      ctx.discardFromHand(1);
    }
  },
  backflip: {
    id:'backflip', name:'Backflip', type:'skill', rarity:'common', for:'silent',
    cost:1, icon:'🔄',
    desc: u => `Gain ${u?6:5} Block. Draw 2 cards.`,
    play(ctx, card) {
      ctx.block(card.upgraded ? 6 : 5);
      ctx.draw(2);
    }
  },
  bane: {
    id:'bane', name:'Bane', type:'attack', rarity:'common', for:'silent',
    cost:1, icon:'☣️',
    desc: u => `Deal ${u?10:7} damage. If the enemy is Poisoned, deal ${u?10:7} damage again.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 10 : 7);
      if ((ctx.getStatus(ti, 'poison') || 0) > 0) ctx.attack(ti, card.upgraded ? 10 : 7);
    }
  },
  poisoned_stab: {
    id:'poisoned_stab', name:'Poisoned Stab', type:'attack', rarity:'common', for:'silent',
    cost:1, icon:'🗡️',
    desc: u => `Deal ${u?8:6} damage. Apply ${u?4:3} Poison.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 8 : 6);
      ctx.status(ti, 'poison', card.upgraded ? 4 : 3);
    }
  },
  caltrops: {
    id:'caltrops', name:'Caltrops', type:'power', rarity:'uncommon', for:'silent',
    cost:1, icon:'🔺',
    desc: u => `Whenever the enemy attacks you, apply ${u?4:3} Weak to them.`,
    play(ctx, card) { ctx.status('player', 'caltrops', card.upgraded ? 4 : 3); }
  },
  catalyst: {
    id:'catalyst', name:'Catalyst', type:'skill', rarity:'uncommon', for:'silent',
    cost:1, icon:'⚗️', exhaust:true,
    desc: u => `Double the enemy's Poison.${u ? ' Triple instead.' : ''} Exhaust.`,
    play(ctx, card, ti) {
      const p = ctx.getStatus(ti, 'poison') || 0;
      const newP = card.upgraded ? p * 2 : p;
      ctx.setStatus(ti, 'poison', p + newP);
    }
  },
  footwork: {
    id:'footwork', name:'Footwork', type:'power', rarity:'uncommon', for:'silent',
    cost:1, icon:'👟',
    desc: u => `Gain ${u?2:1} Dexterity.`,
    play(ctx, card) { ctx.status('player', 'dexterity', card.upgraded ? 2 : 1); }
  },
  predator: {
    id:'predator', name:'Predator', type:'attack', rarity:'uncommon', for:'silent',
    cost:2, icon:'🐆',
    desc: u => `Deal ${u?18:15} damage. At the start of your next turn, draw 2 cards.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 18 : 15);
      ctx.status('player', 'next-turn-draw', 2);
    }
  },
  riddle_with_holes: {
    id:'riddle_with_holes', name:'Riddle With Holes', type:'attack', rarity:'uncommon', for:'silent',
    cost:2, icon:'🔫',
    desc: u => `Deal ${u?3:3} damage ${u?6:5} times.`,
    play(ctx, card, ti) {
      const times = card.upgraded ? 6 : 5;
      for (let i = 0; i < times; i++) ctx.attack(ti, 3);
    }
  },
  noxious_fumes: {
    id:'noxious_fumes', name:'Noxious Fumes', type:'power', rarity:'uncommon', for:'silent',
    cost:1, icon:'☣️',
    desc: u => `At the start of your turn, apply ${u?2:1} Poison to ALL enemies.`,
    play(ctx, card) { ctx.status('player', 'noxious-fumes', card.upgraded ? 2 : 1); }
  },
  dagger_spray: {
    id:'dagger_spray', name:'Dagger Spray', type:'attack', rarity:'uncommon', for:'silent',
    cost:1, icon:'🗡️',
    desc: u => `Deal ${u?6:4} damage to ALL enemies twice.`,
    play(ctx, card) {
      ctx.attackAll(card.upgraded ? 6 : 4);
      ctx.attackAll(card.upgraded ? 6 : 4);
    }
  },
  burst: {
    id:'burst', name:'Burst', type:'skill', rarity:'rare', for:'silent',
    cost:1, icon:'💥',
    desc: u => `This turn, your next ${u?2:1} Skill(s) are played twice.`,
    play(ctx, card) { ctx.status('player', 'burst', card.upgraded ? 2 : 1); }
  },
  corpse_explosion: {
    id:'corpse_explosion', name:'Corpse Explosion', type:'skill', rarity:'rare', for:'silent',
    cost:2, icon:'💣',
    desc: u => `Apply ${u?7:6} Poison. When the enemy dies, deal damage equal to their Poison to ALL enemies.`,
    play(ctx, card, ti) { ctx.status(ti, 'poison', card.upgraded ? 7 : 6); ctx.status(ti, 'corpse-explosion', 1); }
  },
  die_die_die: {
    id:'die_die_die', name:'Die Die Die', type:'attack', rarity:'rare', for:'silent',
    cost:1, icon:'💀', exhaust:true,
    desc: u => `Deal ${u?13:9} damage to ALL enemies. Exhaust.`,
    play(ctx, card) { ctx.attackAll(card.upgraded ? 13 : 9); }
  },
  phantasmal_killer: {
    id:'phantasmal_killer', name:'Phantasmal Killer', type:'skill', rarity:'rare', for:'silent',
    cost:1, icon:'👻',
    desc: u => `${u ? 'This turn, d' : 'Next turn, d'}ouble your next Attack's damage.`,
    play(ctx, card) { ctx.status('player', 'phantasmal', card.upgraded ? 2 : 1); }
  },
  storm_of_steel: {
    id:'storm_of_steel', name:'Storm of Steel', type:'skill', rarity:'rare', for:'silent',
    cost:1, icon:'⛈️', exhaust:true,
    desc: u => `Discard your hand. Add ${u?'2 Shivs':'1 Shiv'} per discarded card to your hand. Exhaust.`,
    play(ctx, card) { ctx.stormOfSteel(card.upgraded ? 2 : 1); }
  },
  tools_of_the_trade: {
    id:'tools_of_the_trade', name:'Tools of the Trade', type:'power', rarity:'rare', for:'silent',
    cost:1, icon:'🔧',
    desc: u => `At the start of your turn, draw 1 card and discard 1 card.`,
    play(ctx) { ctx.status('player', 'tools', 1); }
  },

  /* ——— COLORLESS CARDS ——— */
  bandage_up: {
    id:'bandage_up', name:'Bandage Up', type:'skill', rarity:'colorless', for:'all',
    cost:0, icon:'🩹', exhaust:true,
    desc: u => `Heal ${u?6:4} HP. Exhaust.`,
    play(ctx, card) { ctx.healHp(card.upgraded ? 6 : 4); }
  },
  blind: {
    id:'blind', name:'Blind', type:'skill', rarity:'colorless', for:'all',
    cost:0, icon:'👁️', exhaust:true,
    desc: u => `Apply ${u?2:1} Weak to ALL enemies. Exhaust.`,
    play(ctx, card) { ctx.statusAll('weak', card.upgraded ? 2 : 1); }
  },
  flash_of_steel: {
    id:'flash_of_steel', name:'Flash of Steel', type:'attack', rarity:'colorless', for:'all',
    cost:0, icon:'⚡',
    desc: u => `Deal ${u?6:3} damage. Draw 1 card.`,
    play(ctx, card, ti) {
      ctx.attack(ti, card.upgraded ? 6 : 3);
      ctx.draw(1);
    }
  },
  good_instincts: {
    id:'good_instincts', name:'Good Instincts', type:'skill', rarity:'colorless', for:'all',
    cost:0, icon:'✨',
    desc: u => `Gain ${u?9:6} Block.`,
    play(ctx, card) { ctx.block(card.upgraded ? 9 : 6); }
  },
  swift_strike: {
    id:'swift_strike', name:'Swift Strike', type:'attack', rarity:'colorless', for:'all',
    cost:0, icon:'💨',
    desc: u => `Deal ${u?10:7} damage.`,
    play(ctx, card, ti) { ctx.attack(ti, card.upgraded ? 10 : 7); }
  },
  trip: {
    id:'trip', name:'Trip', type:'skill', rarity:'colorless', for:'all',
    cost:0, icon:'🦶', exhaust:true,
    desc: u => `Apply ${u?2:1} Vulnerable to ALL enemies. Exhaust.`,
    play(ctx, card) { ctx.statusAll('vulnerable', card.upgraded ? 2 : 1); }
  },
  panacea: {
    id:'panacea', name:'Panacea', type:'skill', rarity:'colorless', for:'all',
    cost:0, icon:'💊', exhaust:true,
    desc: u => `Gain ${u?2:1} Artifact. Exhaust.`,
    play(ctx, card) { ctx.status('player', 'artifact', card.upgraded ? 2 : 1); }
  },

  /* ——— STATUS CARDS (added during combat) ——— */
  wound: {
    id:'wound', name:'Wound', type:'status', rarity:'special', for:'all',
    cost:99, icon:'🩸', exhaust:false, unplayable:true,
    desc: () => `Unplayable. Ethereal.`, ethereal:true,
    play(ctx) {}
  },
  dazed: {
    id:'dazed', name:'Dazed', type:'status', rarity:'special', for:'all',
    cost:99, icon:'😵', exhaust:false, unplayable:true,
    desc: () => `Unplayable. Ethereal.`, ethereal:true,
    play(ctx) {}
  },
  burn: {
    id:'burn', name:'Burn', type:'status', rarity:'special', for:'all',
    cost:99, icon:'🔥', exhaust:false, unplayable:true,
    desc: () => `Unplayable. At the end of your turn, take 2 damage.`, ethereal:false,
    play(ctx) {}
  },
  slimed: {
    id:'slimed', name:'Slimed', type:'status', rarity:'special', for:'all',
    cost:1, icon:'🟢', exhaust:true,
    desc: () => `Exhaust.`,
    play(ctx, card, ti, handIdx) { /* just exhaust */ }
  }
};

/* ============================================================
   ENEMIES
   Each enemy:
     id, name, act (1|2|3), type ('normal'|'elite'|'boss')
     hp: [min, max]   icon
     initFn(enemyState, combatState) → called at start of combat
     intentFn(enemyState, combatState) → returns intent object
     actFn(enemyState, ctx) → executes the action
============================================================ */
STS.ENEMIES = {

  /* === ACT 1 NORMAL === */
  cultist: {
    id:'cultist', name:'Cultist', act:1, type:'normal',
    hp:[48,54], icon:'🧙',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn === 0) return {type:'buff', label:'Incantation', icon:'✨'};
      return {type:'attack', label:`Dark Strike`, icon:'⚔️', dmg:6};
    },
    actFn(e, ctx) {
      if (e.ai.turn === 0) { ctx.enemyStatus(e, 'ritual', 3); }
      else { ctx.enemyAttack(e, 6); }
      e.ai.turn++;
    }
  },
  jaw_worm: {
    id:'jaw_worm', name:'Jaw Worm', act:1, type:'normal',
    hp:[40,44], icon:'🦷',
    initFn(e) { e.ai = {turn:0, lastMove:null}; },
    intentFn(e) {
      if (e.ai.turn === 0) return {type:'attack', label:'Chomp', icon:'🦷', dmg:11};
      const r = Math.random();
      if (r < 0.25) return {type:'attack', label:'Chomp', icon:'🦷', dmg:11};
      if (r < 0.55) return {type:'attack_defend', label:'Thrash', icon:'💢', dmg:7};
      return {type:'buff_defend', label:'Bellow', icon:'🐗'};
    },
    actFn(e, ctx) {
      if (e.ai.turn === 0) { ctx.enemyAttack(e, 11); }
      else {
        const r = Math.random();
        if (r < 0.25) { ctx.enemyAttack(e, 11); }
        else if (r < 0.55) { ctx.enemyAttack(e, 7); ctx.enemyGainBlock(e, 5); }
        else { ctx.enemyStatus(e, 'strength', 3); ctx.enemyGainBlock(e, 6); }
      }
      e.ai.turn++;
    }
  },
  louse_red: {
    id:'louse_red', name:'Red Louse', act:1, type:'normal',
    hp:[10,15], icon:'🦟',
    initFn(e) { e.ai = {biteMin: 5, biteMax: 7, turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 3 === 2) return {type:'buff', label:'Grow', icon:'📈'};
      const d = e.ai.biteMin + Math.floor(Math.random() * (e.ai.biteMax - e.ai.biteMin + 1));
      return {type:'attack', label:'Bite', icon:'🦷', dmg:d};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 3 === 2) { ctx.enemyStatus(e, 'strength', 3); }
      else {
        const d = e.ai.biteMin + Math.floor(Math.random() * (e.ai.biteMax - e.ai.biteMin + 1));
        ctx.enemyAttack(e, d);
      }
      e.ai.turn++;
    }
  },
  louse_green: {
    id:'louse_green', name:'Green Louse', act:1, type:'normal',
    hp:[11,17], icon:'🐛',
    initFn(e) { e.ai = {biteMin:3, biteMax:8, turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 3 === 2) return {type:'debuff', label:'Spit Web', icon:'🕸️'};
      const d = e.ai.biteMin + Math.floor(Math.random()*(e.ai.biteMax-e.ai.biteMin+1));
      return {type:'attack', label:'Bite', icon:'🦷', dmg:d};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 3 === 2) { ctx.statusPlayer('weak', 2); }
      else {
        const d = e.ai.biteMin + Math.floor(Math.random()*(e.ai.biteMax-e.ai.biteMin+1));
        ctx.enemyAttack(e, d);
      }
      e.ai.turn++;
    }
  },
  fungal_beast: {
    id:'fungal_beast', name:'Fungal Beast', act:1, type:'normal',
    hp:[22,28], icon:'🍄',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 2 === 0) return {type:'attack', label:'Bite', icon:'🦷', dmg:6};
      return {type:'buff', label:'Grow', icon:'📈'};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 2 === 0) { ctx.enemyAttack(e, 6); }
      else { ctx.enemyStatus(e, 'strength', 3); }
      e.ai.turn++;
    }
  },
  blue_slaver: {
    id:'blue_slaver', name:'Blue Slaver', act:1, type:'normal',
    hp:[46,50], icon:'⛓️',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 3 !== 1) return {type:'attack', label:'Stab', icon:'⚔️', dmg:12};
      return {type:'attack_debuff', label:'Rake', icon:'🔻', dmg:7};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 3 !== 1) { ctx.enemyAttack(e, 12); }
      else { ctx.enemyAttack(e, 7); ctx.statusPlayer('weak', 1); }
      e.ai.turn++;
    }
  },
  red_slaver: {
    id:'red_slaver', name:'Red Slaver', act:1, type:'normal',
    hp:[46,50], icon:'🔗',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 3 === 0) return {type:'attack', label:'Stab', icon:'⚔️', dmg:13};
      if (e.ai.turn % 3 === 1) return {type:'attack_debuff', label:'Scrape', icon:'🪨', dmg:8};
      return {type:'debuff', label:'Entangle', icon:'🕸️'};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 3 === 0) { ctx.enemyAttack(e, 13); }
      else if (e.ai.turn % 3 === 1) { ctx.enemyAttack(e, 8); ctx.statusPlayer('vulnerable', 1); }
      else { ctx.statusPlayer('entangled', 1); }
      e.ai.turn++;
    }
  },

  /* === ACT 1 ELITE === */
  gremlin_nob: {
    id:'gremlin_nob', name:'Gremlin Nob', act:1, type:'elite',
    hp:[82,86], icon:'👺',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn === 0) return {type:'buff', label:'Bellow', icon:'📣'};
      if (e.ai.turn % 2 === 1) return {type:'attack_debuff', label:'Skull Bash', icon:'💀', dmg:6};
      return {type:'attack', label:'Rush', icon:'💨', dmg:14};
    },
    actFn(e, ctx) {
      if (e.ai.turn === 0) { ctx.enemyStatus(e, 'strength', 2); ctx.enemyGainBlock(e, 6); }
      else if (e.ai.turn % 2 === 1) { ctx.enemyAttack(e, 6); ctx.statusPlayer('vulnerable', 2); }
      else { ctx.enemyAttack(e, 14); }
      e.ai.turn++;
    }
  },
  lagavulin: {
    id:'lagavulin', name:'Lagavulin', act:1, type:'elite',
    hp:[110,114], icon:'😴',
    initFn(e) { e.ai = {turn:0, awake:false}; e.block = 8; },
    intentFn(e) {
      if (e.ai.turn < 3) return {type:'unknown', label:'Sleeping...', icon:'💤'};
      if (!e.ai.awake) return {type:'debuff', label:'Siphon Soul', icon:'👿'};
      return {type:'attack', label:'Attack', icon:'⚔️', dmg:18};
    },
    actFn(e, ctx) {
      if (e.ai.turn < 3) { /* sleeping */ }
      else if (!e.ai.awake) {
        ctx.statusPlayer('strength', -2);
        ctx.statusPlayer('dexterity', -2);
        e.ai.awake = true;
      } else { ctx.enemyAttack(e, 18); }
      e.ai.turn++;
    }
  },

  /* === ACT 1 BOSS === */
  slime_boss: {
    id:'slime_boss', name:'Slime Boss', act:1, type:'boss',
    hp:[140,140], icon:'🟢',
    initFn(e) { e.ai = {turn:0, split:false, pattern:['Goop','Slam','Slam','Goop']}; },
    intentFn(e) {
      if (!e.ai || !e.ai.pattern) return {type:'unknown', label:'...', icon:'❓'};
      if (!e.ai.split && e.hp <= e.maxHp * 0.5) return {type:'special', label:'Split!', icon:'💥'};
      const p = e.ai.pattern[e.ai.turn % e.ai.pattern.length];
      if (p === 'Goop') return {type:'debuff', label:'Gooey', icon:'🟤'};
      return {type:'attack', label:'Slam', icon:'💥', dmg:35};
    },
    actFn(e, ctx) {
      if (!e.ai.split && e.hp <= e.maxHp * 0.5) {
        e.ai.split = true;
        ctx.spawnSplitSlimes(e);
        return;
      }
      const p = e.ai.pattern[e.ai.turn % e.ai.pattern.length];
      if (p === 'Goop') { ctx.addCardToDiscard('slimed', false); }
      else { ctx.enemyAttack(e, 35); }
      e.ai.turn++;
    }
  },
  the_guardian: {
    id:'the_guardian', name:'The Guardian', act:1, type:'boss',
    hp:[240,240], icon:'🗿',
    initFn(e) { e.ai = {turn:0, mode:'normal', shieldDmg:0}; },
    intentFn(e) {
      if (e.ai.mode === 'normal') {
        const p = e.ai.turn % 4;
        if (p === 0) return {type:'attack', label:'Fierce Bash', icon:'🔨', dmg:32};
        if (p === 1) return {type:'defend_buff', label:'Charging Up', icon:'⚡'};
        if (p === 2) return {type:'attack', label:'Whirlwind', icon:'🌪️', dmg:5};
        return {type:'special', label:'Close Up', icon:'🛡️'};
      }
      // Defensive mode
      const p = e.ai.turn % 3;
      if (p === 0) return {type:'defend', label:'Twin Slam', icon:'🛡️'};
      if (p === 1) return {type:'attack', label:'Vent Steam', icon:'💨', dmg:7};
      return {type:'special', label:'Open Up', icon:'🔓'};
    },
    actFn(e, ctx) {
      if (e.ai.mode === 'normal') {
        const p = e.ai.turn % 4;
        if (p === 0) { ctx.enemyAttack(e, 32); }
        else if (p === 1) { ctx.enemyGainBlock(e, 12); ctx.enemyStatus(e, 'strength', 2); }
        else if (p === 2) { for(let i=0;i<4;i++) ctx.enemyAttack(e,5); }
        else { e.ai.mode = 'defense'; ctx.enemyGainBlock(e, 40); }
      } else {
        const p = e.ai.turn % 3;
        if (p === 0) { ctx.enemyGainBlock(e, 20); }
        else if (p === 1) { ctx.statusPlayer('vulnerable', 2); ctx.statusPlayer('weak', 2); }
        else { e.ai.mode = 'normal'; }
      }
      e.ai.turn++;
    }
  },
  hexaghost: {
    id:'hexaghost', name:'Hexaghost', act:1, type:'boss',
    hp:[250,250], icon:'👻',
    initFn(e) { e.ai = {turn:0, dmgBase:6}; },
    intentFn(e) {
      const t = e.ai.turn % 7;
      if (t === 0) return {type:'debuff', label:'Divider', icon:'🔺'};
      if (t < 3) return {type:'attack', label:`Inferno (×6)`, icon:'🔥', dmg:e.ai.dmgBase};
      if (t === 3) return {type:'attack', label:'Sear', icon:'🔥', dmg:6};
      if (t < 6) return {type:'attack', label:`Inferno (×6)`, icon:'🔥', dmg:e.ai.dmgBase+2};
      return {type:'buff', label:'Activate', icon:'⚡'};
    },
    actFn(e, ctx) {
      const t = e.ai.turn % 7;
      if (t === 0) { ctx.addBurnsToPlayer(6); e.ai.dmgBase = 2; }
      else if (t < 3 || (t >= 4 && t < 6)) { for(let i=0;i<6;i++) ctx.enemyAttack(e, e.ai.dmgBase); }
      else if (t === 3) { ctx.enemyAttack(e, 6); }
      else { e.ai.dmgBase += 2; }
      e.ai.turn++;
    }
  },

  /* === ACT 2 NORMAL === */
  chosen: {
    id:'chosen', name:'Chosen', act:2, type:'normal',
    hp:[88,96], icon:'🧿',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      const t = e.ai.turn % 3;
      if (t === 0) return {type:'debuff', label:'Poke', icon:'👆'};
      if (t === 1) return {type:'attack', label:'Hex', icon:'💜', dmg:12};
      return {type:'debuff', label:'Dark Shackles', icon:'⛓️'};
    },
    actFn(e, ctx) {
      const t = e.ai.turn % 3;
      if (t === 0) { ctx.statusPlayer('vulnerable', 1); ctx.statusPlayer('weak', 1); }
      else if (t === 1) { ctx.enemyAttack(e, 12); }
      else { ctx.statusPlayer('strength', -9); ctx.statusPlayer('temp-strength', 9); }
      e.ai.turn++;
    }
  },
  byrd: {
    id:'byrd', name:'Byrd', act:2, type:'normal',
    hp:[25,31], icon:'🐦',
    initFn(e) { e.ai = {turn:0}; e.block = 0; },
    intentFn(e) {
      if (e.ai.turn % 4 === 0) return {type:'defend', label:'Fly', icon:'✈️'};
      return {type:'attack', label:'Peck', icon:'🐦', dmg:5};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 4 === 0) { ctx.enemyGainBlock(e, 9); }
      else { ctx.enemyAttack(e, 5); }
      e.ai.turn++;
    }
  },
  book_of_stabbing: {
    id:'book_of_stabbing', name:'Book of Stabbing', act:2, type:'normal',
    hp:[160,170], icon:'📖',
    initFn(e) { e.ai = {turn:0, stabs:0}; },
    intentFn(e) {
      if (e.ai.stabs < 3) return {type:'debuff', label:'Multi-Stab (charging)', icon:'📖'};
      return {type:'attack', label:`Multi-Stab (×${e.ai.stabs})`, icon:'🗡️', dmg:6};
    },
    actFn(e, ctx) {
      if (e.ai.stabs < 3) { e.ai.stabs++; ctx.statusPlayer('wound-count', 1); }
      else { for(let i=0;i<e.ai.stabs;i++) ctx.enemyAttack(e, 6); e.ai.stabs = 0; }
      e.ai.turn++;
    }
  },
  centurion: {
    id:'centurion', name:'Centurion', act:2, type:'normal',
    hp:[76,84], icon:'⚔️',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 3 === 2) return {type:'buff', label:'Fury', icon:'💢'};
      if (e.ai.turn % 2 === 0) return {type:'attack', label:'Slash', icon:'⚔️', dmg:12};
      return {type:'attack', label:'Fury Strike', icon:'⚡', dmg:8};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 3 === 2) { ctx.enemyStatus(e, 'strength', 4); }
      else if (e.ai.turn % 2 === 0) { ctx.enemyAttack(e, 12); }
      else { ctx.enemyAttack(e, 8); ctx.enemyAttack(e, 8); }
      e.ai.turn++;
    }
  },

  /* === ACT 2 ELITE === */
  gremlin_leader: {
    id:'gremlin_leader', name:'Gremlin Leader', act:2, type:'elite',
    hp:[140,148], icon:'👑',
    initFn(e) { e.ai = {turn:0, rallied:false}; },
    intentFn(e) {
      if (e.ai.turn % 3 === 0 && !e.ai.rallied) return {type:'special', label:'Rally!', icon:'📣'};
      if (e.ai.turn % 2 === 0) return {type:'attack', label:'Encourage', icon:'💬', dmg:6};
      return {type:'defend', label:'Protect', icon:'🛡️'};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 3 === 0 && !e.ai.rallied) {
        ctx.spawnGremlins(e, 3);
        e.ai.rallied = true;
      } else if (e.ai.turn % 2 === 0) {
        ctx.enemyAttack(e, 6);
        ctx.buffAllEnemies('strength', 2);
      } else { ctx.enemyGainBlock(e, 12); }
      e.ai.turn++;
    }
  },
  slavers: {
    id:'slavers', name:'The Slavers', act:2, type:'elite',
    hp:[48,52], icon:'⛓️',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      const t = e.ai.turn % 4;
      if (t === 0) return {type:'attack', label:'Whip', icon:'🪢', dmg:16};
      if (t === 1) return {type:'attack_debuff', label:'Shackle', icon:'⛓️', dmg:8};
      if (t === 2) return {type:'debuff', label:'Entangle', icon:'🕸️'};
      return {type:'attack', label:'Dual Whip', icon:'⚡', dmg:12};
    },
    actFn(e, ctx) {
      const t = e.ai.turn % 4;
      if (t === 0) { ctx.enemyAttack(e, 16); }
      else if (t === 1) { ctx.enemyAttack(e, 8); ctx.statusPlayer('weak', 2); }
      else if (t === 2) { ctx.statusPlayer('entangled', 1); }
      else { ctx.enemyAttack(e, 12); ctx.enemyAttack(e, 12); }
      e.ai.turn++;
    }
  },

  /* === ACT 2 BOSS === */
  the_champ: {
    id:'the_champ', name:'The Champ', act:2, type:'boss',
    hp:[480,480], icon:'🏆',
    initFn(e) { e.ai = {turn:0, phase:1}; },
    intentFn(e) {
      if (e.ai.phase === 1) {
        const t = e.ai.turn % 5;
        if (t === 0) return {type:'defend_buff', label:'Flex', icon:'💪'};
        if (t < 3) return {type:'attack', label:'Face Slap', icon:'👋', dmg:12};
        if (t === 3) return {type:'debuff', label:'Taunt', icon:'😤'};
        return {type:'attack', label:'Heavy Slash', icon:'🗡️', dmg:16};
      }
      const t = e.ai.turn % 3;
      if (t === 0) return {type:'buff', label:'Frenzy', icon:'😡'};
      if (t === 1) return {type:'attack', label:'Clinch', icon:'🤼', dmg:14};
      return {type:'attack', label:'Heavy Blow', icon:'💥', dmg:20};
    },
    actFn(e, ctx) {
      if (e.ai.phase === 1 && e.hp <= e.maxHp * 0.5) {
        e.ai.phase = 2;
        e.ai.turn = 0;
        ctx.enemyStatus(e, 'strength', 12);
        ctx.notify('The Champ enters Phase 2!');
      }
      if (e.ai.phase === 1) {
        const t = e.ai.turn % 5;
        if (t === 0) { ctx.enemyStatus(e, 'strength', 3); ctx.enemyGainBlock(e, 10); }
        else if (t < 3) { ctx.enemyAttack(e, 12); }
        else if (t === 3) { ctx.statusPlayer('weak', 1); ctx.statusPlayer('vulnerable', 1); }
        else { ctx.enemyAttack(e, 16); }
      } else {
        const t = e.ai.turn % 3;
        if (t === 0) { ctx.enemyStatus(e, 'strength', 5); }
        else if (t === 1) { ctx.enemyAttack(e, 14); ctx.statusPlayer('vulnerable', 2); }
        else { ctx.enemyAttack(e, 20); }
      }
      e.ai.turn++;
    }
  },
  automaton: {
    id:'automaton', name:'Bronze Automaton', act:2, type:'boss',
    hp:[300,300], icon:'🤖',
    initFn(e) { e.ai = {turn:0, charged:0}; },
    intentFn(e) {
      const t = e.ai.turn % 8;
      if (t < 3) return {type:'attack', label:'Flail', icon:'⛓️', dmg:7};
      if (t < 5) return {type:'buff', label:'Boost', icon:'⚡'};
      if (t === 5) return {type:'attack', label:'Hyper Beam', icon:'🔆', dmg:45};
      return {type:'defend', label:'Stunned', icon:'😵'};
    },
    actFn(e, ctx) {
      const t = e.ai.turn % 8;
      if (t < 3) { ctx.enemyAttack(e, 7); ctx.enemyAttack(e, 7); }
      else if (t < 5) { ctx.enemyStatus(e, 'strength', 4); ctx.enemyGainBlock(e, 7); }
      else if (t === 5) { ctx.enemyAttack(e, 45); }
      else { /* stunned, no action */ }
      e.ai.turn++;
    }
  },

  /* === ACT 3 NORMAL === */
  spire_guard: {
    id:'spire_guard', name:'Spire Guard', act:3, type:'normal',
    hp:[130,140], icon:'💂',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 4 === 0) return {type:'defend', label:'Fortify', icon:'🏰'};
      if (e.ai.turn % 2 === 0) return {type:'attack', label:'Bash', icon:'🔨', dmg:18};
      return {type:'attack_debuff', label:'Whack', icon:'💥', dmg:10};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 4 === 0) { ctx.enemyGainBlock(e, 15); ctx.enemyStatus(e, 'strength', 2); }
      else if (e.ai.turn % 2 === 0) { ctx.enemyAttack(e, 18); }
      else { ctx.enemyAttack(e, 10); ctx.statusPlayer('vulnerable', 1); }
      e.ai.turn++;
    }
  },
  spire_archer: {
    id:'spire_archer', name:'Spire Archer', act:3, type:'normal',
    hp:[90,100], icon:'🏹',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 3 === 0) return {type:'debuff', label:'Swoop', icon:'🎯'};
      return {type:'attack', label:'Puncture', icon:'🏹', dmg:8};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 3 === 0) { ctx.statusPlayer('weak', 2); ctx.statusPlayer('vulnerable', 2); }
      else { ctx.enemyAttack(e, 8); ctx.enemyAttack(e, 8); }
      e.ai.turn++;
    }
  },
  transient: {
    id:'transient', name:'Transient', act:3, type:'normal',
    hp:[999,999], icon:'👁️',
    initFn(e) { e.ai = {turn:0, turnsLeft:5}; e.intangible = 0; },
    intentFn(e) {
      return {type:'attack', label:`Fury (${e.ai.turnsLeft} turns left)`, icon:'💥', dmg:30};
    },
    actFn(e, ctx) {
      ctx.enemyAttack(e, 30);
      e.ai.turnsLeft--;
      if (e.ai.turnsLeft <= 0) {
        e.hp = 0;
        ctx.notify('The Transient fades away...');
      }
      e.ai.turn++;
    }
  },

  /* === ACT 3 ELITE === */
  nemesis: {
    id:'nemesis', name:'Nemesis', act:3, type:'elite',
    hp:[186,192], icon:'⚫',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      const t = e.ai.turn % 6;
      if (t % 2 === 0) return {type:'unknown', label:'Intangible', icon:'👁️'};
      if (t === 1) return {type:'attack', label:'Scythe', icon:'⚫', dmg:10};
      if (t === 3) return {type:'debuff', label:'Burn All', icon:'🔥'};
      return {type:'attack', label:'Scythe', icon:'⚫', dmg:18};
    },
    actFn(e, ctx) {
      const t = e.ai.turn % 6;
      if (t % 2 === 0) { ctx.enemySetIntangible(e, true); }
      else {
        ctx.enemySetIntangible(e, false);
        if (t === 1) { ctx.enemyAttack(e, 10); ctx.enemyAttack(e, 10); ctx.enemyAttack(e, 10); }
        else if (t === 3) { ctx.addBurnsToPlayer(3); }
        else { ctx.enemyAttack(e, 18); }
      }
      e.ai.turn++;
    }
  },
  giant_head: {
    id:'giant_head', name:'Giant Head', act:3, type:'elite',
    hp:[500,510], icon:'🗿',
    initFn(e) { e.ai = {turn:0, count:30}; },
    intentFn(e) {
      if (e.ai.count <= 0) return {type:'attack', label:`It is time! (${30} dmg)`, icon:'💥', dmg:30};
      if (e.ai.turn % 4 < 3) return {type:'debuff', label:`The Count (${e.ai.count})`, icon:'🔢'};
      return {type:'attack', label:'Glare', icon:'👁️', dmg:8};
    },
    actFn(e, ctx) {
      if (e.ai.count <= 0) { ctx.enemyAttack(e, 30); }
      else if (e.ai.turn % 4 < 3) {
        e.ai.count -= 10;
        ctx.statusPlayer('frail', 1);
      } else { ctx.enemyAttack(e, 8); }
      e.ai.turn++;
    }
  },

  /* === ACT 3 BOSS === */
  donu_and_deca: {
    id:'donu_and_deca', name:'Donu & Deca', act:3, type:'boss',
    hp:[300,300], icon:'⭕',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 2 === 0) return {type:'buff', label:'Circle of Power', icon:'⭕'};
      return {type:'attack', label:'Beam', icon:'💥', dmg:10};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 2 === 0) {
        ctx.statusPlayer('strength', -2);
        ctx.buffAllEnemies('strength', 3);
      } else {
        ctx.enemyAttack(e, 10);
        ctx.enemyAttack(e, 10);
        ctx.enemyAttack(e, 10);
      }
      e.ai.turn++;
    }
  },
  time_eater: {
    id:'time_eater', name:'Time Eater', act:3, type:'boss',
    hp:[456,480], icon:'⏳',
    initFn(e) { e.ai = {turn:0, cardsPlayedThisTurn:0}; },
    intentFn(e) {
      const t = e.ai.turn % 4;
      if (t < 2) return {type:'attack', label:'Reverberate', icon:'🌀', dmg:18};
      if (t === 2) return {type:'debuff', label:'Ripple', icon:'💫'};
      return {type:'defend_buff', label:'Haste', icon:'⚡'};
    },
    actFn(e, ctx) {
      const t = e.ai.turn % 4;
      if (t < 2) { ctx.enemyAttack(e, 18); ctx.enemyAttack(e, 18); }
      else if (t === 2) { ctx.statusPlayer('frail', 2); ctx.statusPlayer('weak', 2); }
      else { ctx.enemyStatus(e, 'strength', 4); ctx.enemyGainBlock(e, 25); }
      e.ai.turn++;
    }
  },
  awakened_one: {
    id:'awakened_one', name:'The Awakened One', act:3, type:'boss',
    hp:[300,300], icon:'🌑',
    initFn(e) { e.ai = {turn:0, phase:1, revived:false}; },
    intentFn(e) {
      if (e.ai.phase === 1) {
        const t = e.ai.turn % 4;
        if (t === 0) return {type:'attack', label:'Slash', icon:'🌑', dmg:20};
        if (t === 1) return {type:'debuff', label:'Dark Echo', icon:'🌀'};
        if (t === 2) return {type:'attack', label:'Rake', icon:'✦', dmg:9};
        return {type:'buff', label:'Rebirth', icon:'🌟'};
      }
      const t = e.ai.turn % 3;
      if (t === 0) return {type:'attack', label:'Sludge', icon:'🌊', dmg:25};
      if (t === 1) return {type:'buff', label:'Fury', icon:'😤'};
      return {type:'attack', label:'Noxious Fumes', icon:'☣️', dmg:16};
    },
    actFn(e, ctx) {
      if (e.ai.phase === 1) {
        if (e.hp <= 0 && !e.ai.revived) {
          e.hp = 1;
          e.ai.phase = 2;
          e.ai.revived = true;
          e.ai.turn = 0;
          ctx.notify('The Awakened One is reborn!');
          ctx.statusPlayer('vulnerable', 99); // clear all powers
          return;
        }
        const t = e.ai.turn % 4;
        if (t === 0) { ctx.enemyAttack(e, 20); }
        else if (t === 1) { ctx.statusPlayer('vulnerable', 2); }
        else if (t === 2) { for(let i=0;i<4;i++) ctx.enemyAttack(e,9); }
        else { ctx.enemyStatus(e, 'strength', 8); ctx.enemyGainBlock(e, 15); }
      } else {
        const t = e.ai.turn % 3;
        if (t === 0) { ctx.enemyAttack(e, 25); ctx.statusPlayer('vulnerable', 2); }
        else if (t === 1) { ctx.enemyStatus(e, 'strength', 6); }
        else { ctx.enemyAttack(e, 16); ctx.addCardToDiscard('wound', false); }
      }
      e.ai.turn++;
    }
  },

  /* === SMALL SLIMES (spawned) === */
  small_slime: {
    id:'small_slime', name:'Small Slime', act:1, type:'normal',
    hp:[28,32], icon:'🫧',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) {
      if (e.ai.turn % 2 === 0) return {type:'attack', label:'Tackle', icon:'💦', dmg:8};
      return {type:'debuff', label:'Gooey', icon:'🟢'};
    },
    actFn(e, ctx) {
      if (e.ai.turn % 2 === 0) { ctx.enemyAttack(e, 8); }
      else { ctx.addCardToDiscard('slimed', false); }
      e.ai.turn++;
    }
  },
  gremlin_mad: {
    id:'gremlin_mad', name:'Mad Gremlin', act:2, type:'normal',
    hp:[20,24], icon:'😤',
    initFn(e) { e.ai = {turn:0}; },
    intentFn(e) { return {type:'attack', label:'Scratch', icon:'✋', dmg:4}; },
    actFn(e, ctx) { ctx.enemyAttack(e, 4); e.ai.turn++; }
  }
};

/* ============================================================
   RELICS
   Each relic:
     id, name, icon, desc, rarity ('starter'|'common'|'uncommon'|'rare'|'boss'|'shop')
     for ('ironclad'|'silent'|'all')
     onCombatStart(ctx)
     onCombatEnd(ctx)
     onStartTurn(ctx)
     onEndTurn(ctx)
     onPlayerAttack(ctx, damage) → modified damage
     onPlayerBlock(ctx, block) → modified block
     onCardPlay(ctx, card)
     onCardExhaust(ctx, card)
     onTakeDamage(ctx, damage) → modified damage
     onHpLoss(ctx, amount)
     onEnterRest(ctx)
     onGetPotion(ctx)
============================================================ */
STS.RELICS = {
  burning_blood: {
    id:'burning_blood', name:'Burning Blood', icon:'🔥', rarity:'starter', for:'ironclad',
    desc: 'At the end of combat, heal 6 HP.',
    onCombatEnd(ctx) { ctx.healHp(6); }
  },
  ring_of_snake: {
    id:'ring_of_snake', name:'Ring of the Snake', icon:'🐍', rarity:'starter', for:'silent',
    desc: 'At the start of each combat, draw 2 additional cards.',
    onCombatStart(ctx) { ctx.draw(2); }
  },
  vajra: {
    id:'vajra', name:'Vajra', icon:'⚡', rarity:'common', for:'all',
    desc: 'At the start of each combat, gain 1 Strength.',
    onCombatStart(ctx) { ctx.status('player', 'strength', 1); }
  },
  anchor: {
    id:'anchor', name:'Anchor', icon:'⚓', rarity:'common', for:'all',
    desc: 'At the start of each combat, gain 10 Block.',
    onCombatStart(ctx) { ctx.block(10); }
  },
  lantern: {
    id:'lantern', name:'Lantern', icon:'🏮', rarity:'common', for:'all',
    desc: 'On the first turn of each combat, gain 1 Energy.',
    onCombatStart(ctx) { ctx.gainEnergy(1); }
  },
  bronze_scales: {
    id:'bronze_scales', name:'Bronze Scales', icon:'🐉', rarity:'common', for:'all',
    desc: 'Whenever you take damage, deal 3 damage back.',
    onTakeDamage(ctx, dmg) { if (dmg > 0) ctx.dealDamageToEnemy(3, 'all'); return dmg; }
  },
  centennial_puzzle: {
    id:'centennial_puzzle', name:'Centennial Puzzle', icon:'🧩', rarity:'common', for:'all',
    desc: 'The first time you take damage each combat, draw 3 cards.',
    _triggered: false,
    onCombatStart() { this._triggered = false; },
    onTakeDamage(ctx, dmg) {
      if (dmg > 0 && !this._triggered) { this._triggered = true; ctx.draw(3); }
      return dmg;
    }
  },
  bag_of_marbles: {
    id:'bag_of_marbles', name:'Bag of Marbles', icon:'🔮', rarity:'common', for:'all',
    desc: 'At the start of each combat, apply 1 Vulnerable to ALL enemies.',
    onCombatStart(ctx) { ctx.statusAll('vulnerable', 1); }
  },
  blood_vial: {
    id:'blood_vial', name:'Blood Vial', icon:'🧪', rarity:'common', for:'all',
    desc: 'At the start of each combat, heal 2 HP.',
    onCombatStart(ctx) { ctx.healHp(2); }
  },
  oddly_smooth_stone: {
    id:'oddly_smooth_stone', name:'Oddly Smooth Stone', icon:'🪨', rarity:'common', for:'all',
    desc: 'At the start of each combat, gain 1 Dexterity.',
    onCombatStart(ctx) { ctx.status('player', 'dexterity', 1); }
  },
  pen_nib: {
    id:'pen_nib', name:'Pen Nib', icon:'🖊️', rarity:'common', for:'all',
    desc: 'Every 10th Attack you play deals double damage.',
    _count: 0,
    onCombatStart() { /* preserve count */ },
    onCardPlay(ctx, card) {
      if (card.type === 'attack') {
        this._count++;
        if (this._count % 10 === 0) ctx.setFlag('doubleDamage', true);
      }
    }
  },
  akabeko: {
    id:'akabeko', name:'Akabeko', icon:'🐄', rarity:'common', for:'all',
    desc: 'Your first Attack each combat deals 8 additional damage.',
    _used: false,
    onCombatStart() { this._used = false; },
    onCardPlay(ctx, card) {
      if (card.type === 'attack' && !this._used) {
        this._used = true;
        ctx.setFlag('bonusDamage', 8);
      }
    }
  },
  orichalcum: {
    id:'orichalcum', name:'Orichalcum', icon:'✨', rarity:'common', for:'all',
    desc: 'If you end your turn with no Block, gain 6 Block.',
    onEndTurn(ctx) { if (ctx.getPlayerBlock() === 0) ctx.block(6); }
  },
  meat_on_the_bone: {
    id:'meat_on_the_bone', name:'Meat on the Bone', icon:'🍖', rarity:'uncommon', for:'all',
    desc: 'If your HP is at or below 50% at the end of combat, heal 12 HP.',
    onCombatEnd(ctx) {
      const p = ctx.getPlayer();
      if (p.hp <= p.maxHp * 0.5) ctx.healHp(12);
    }
  },
  gremlin_horn: {
    id:'gremlin_horn', name:'Gremlin Horn', icon:'🎺', rarity:'uncommon', for:'all',
    desc: 'Whenever an enemy dies, gain 1 Energy and draw 1 card.',
    onEnemyDeath(ctx) { ctx.gainEnergy(1); ctx.draw(1); }
  },
  ice_cream: {
    id:'ice_cream', name:'Ice Cream', icon:'🍦', rarity:'uncommon', for:'all',
    desc: 'Energy is now preserved between turns.',
    persistent: true // handled in combat engine
  },
  letters_from_nowhere: {
    id:'letters_from_nowhere', name:'Letters from Nowhere', icon:'📨', rarity:'uncommon', for:'all',
    desc: 'At the start of combat, draw 1 extra card.',
    onCombatStart(ctx) { ctx.draw(1); }
  },
  lizard_tail: {
    id:'lizard_tail', name:'Lizard Tail', icon:'🦎', rarity:'uncommon', for:'all',
    desc: 'When you would die, heal to 50% HP instead. Removed after use.',
    _used: false,
    onCombatStart() { /* don't reset */ },
    onWouldDie(ctx) {
      if (!this._used) {
        this._used = true;
        const p = ctx.getPlayer();
        p.hp = Math.floor(p.maxHp * 0.5);
        ctx.notify('Lizard Tail activated!');
        ctx.removeRelic('lizard_tail');
        return true; // cancel death
      }
      return false;
    }
  },
  nunchaku: {
    id:'nunchaku', name:'Nunchaku', icon:'⛓️', rarity:'uncommon', for:'all',
    desc: 'Every 10th Attack you play, gain 1 Energy.',
    _count: 0,
    onCombatStart() {},
    onCardPlay(ctx, card) {
      if (card.type === 'attack') {
        this._count++;
        if (this._count % 10 === 0) ctx.gainEnergy(1);
      }
    }
  },
  dumbbell: {
    id:'dumbbell', name:'Dumbbell', icon:'🏋️', rarity:'uncommon', for:'all',
    desc: 'When you pick up a card, gain 1 Strength at the start of your next combat.',
    _pendingStr: 0,
    onCardPickup() { this._pendingStr++; },
    onCombatStart(ctx) {
      if (this._pendingStr > 0) { ctx.status('player', 'strength', this._pendingStr); this._pendingStr = 0; }
    }
  },
  prayer_wheel: {
    id:'prayer_wheel', name:'Prayer Wheel', icon:'🕸️', rarity:'rare', for:'all',
    desc: 'Normal enemies drop an additional card reward.',
    cardBonus: true
  },
  stone_calendar: {
    id:'stone_calendar', name:'Stone Calendar', icon:'📅', rarity:'rare', for:'all',
    desc: 'At the end of turn 7 of any combat, deal 52 damage to ALL enemies.',
    onEndTurn(ctx) {
      if (ctx.getCombatTurn() === 7) ctx.dealDamageToEnemy(52, 'all');
    }
  },
  nilrys_codex: {
    id:'nilrys_codex', name:"Nilry's Codex", icon:'📙', rarity:'rare', for:'all',
    desc: 'At the end of your turn, choose 1 of 3 random cards to add to your hand (doesn\'t cost energy).',
    onEndTurn(ctx) { ctx.nilryChoice(); }
  },
  philosophers_stone: {
    id:'philosophers_stone', name:"Philosopher's Stone", icon:'💎', rarity:'boss', for:'all',
    desc: 'Gain 1 Energy at the start of each turn. ALL enemies start with 1 Strength.',
    onCombatStart(ctx) { ctx.buffAllEnemies('strength', 1); },
    onStartTurn(ctx) { ctx.gainEnergy(1); }
  },
  fusion_hammer: {
    id:'fusion_hammer', name:'Fusion Hammer', icon:'🔨', rarity:'boss', for:'all',
    desc: 'Gain 1 Energy at the start of each turn. You can no longer Smith at rest sites.',
    onStartTurn(ctx) { ctx.gainEnergy(1); }
  },
  snecko_eye: {
    id:'snecko_eye', name:'Snecko Eye', icon:'🐍', rarity:'boss', for:'all',
    desc: 'Draw 2 additional cards each turn. The cost of cards in your hand is randomized (0-3) at the start of each turn.',
    onCombatStart(ctx) { ctx.draw(2); },
    onStartTurn(ctx) { ctx.randomizeHandCosts(); ctx.draw(2); }
  },
  busted_crown: {
    id:'busted_crown', name:'Busted Crown', icon:'👑', rarity:'boss', for:'all',
    desc: 'Gain 1 Energy at the start of each turn. Card Rewards offer 2 fewer choices.',
    onStartTurn(ctx) { ctx.gainEnergy(1); }
  }
};

/* ============================================================
   EVENTS
   Each event: id, title, desc, icon, choices[]
   Each choice: text, effect(ctx), result (text shown after)
============================================================ */
STS.EVENTS = [
  {
    id: 'the_cleric',
    title: 'The Cleric',
    icon: '🧝',
    desc: 'You encounter a friendly Cleric who offers their services.',
    choices: [
      {
        text: 'Heal (35 gold)',
        condition: ctx => ctx.getGold() >= 35,
        effect(ctx) { ctx.spendGold(35); ctx.healHp(Math.floor(ctx.getPlayer().maxHp * 0.25)); },
        result: 'You feel refreshed. HP restored.'
      },
      {
        text: 'Purify (50 gold) — Remove a card from your deck',
        condition: ctx => ctx.getGold() >= 50,
        effect(ctx) { ctx.spendGold(50); ctx.removeCardFromDeck(); },
        result: 'Your deck feels lighter.'
      },
      {
        text: 'Leave',
        effect() {},
        result: 'You continue on your journey.'
      }
    ]
  },
  {
    id: 'the_library',
    title: 'The Library',
    icon: '📚',
    desc: 'You find a grand library. The books whisper secrets to you.',
    choices: [
      {
        text: 'Read a book (Sleep, then draw 7 cards)',
        effect(ctx) {
          const cards = ctx.pickRandomCards(7, 'all', false);
          cards.forEach(c => ctx.addCardToDeck(c.id, false));
        },
        result: 'You wake up with new knowledge. Added 7 random cards to your deck.'
      },
      {
        text: 'Leave',
        effect() {},
        result: 'You resist the temptation.'
      }
    ]
  },
  {
    id: 'dead_adventurer',
    title: 'Dead Adventurer',
    icon: '💀',
    desc: 'You find the remains of an adventurer who did not make it this far.',
    choices: [
      {
        text: 'Search the body (60% chance: relic; 40% chance: 3 enemies attack)',
        effect(ctx) {
          if (Math.random() < 0.6) {
            ctx.gainRelicRandom();
            ctx.notify('You found a relic!');
          } else {
            ctx.notify('You triggered a trap!');
            ctx.loseHpDirect(Math.floor(ctx.getPlayer().maxHp * 0.1));
          }
        },
        result: 'You rummage through the remains...'
      },
      {
        text: 'Leave in peace',
        effect() {},
        result: 'You respect the fallen.'
      }
    ]
  },
  {
    id: 'mushrooms',
    title: 'Mushrooms',
    icon: '🍄',
    desc: 'Bioluminescent mushrooms line the cave walls. They look... appetizing?',
    choices: [
      {
        text: 'Eat the mushrooms',
        effect(ctx) {
          const r = Math.random();
          if (r < 0.33) { ctx.healHp(12); ctx.notify('Delicious! Healed 12 HP.'); }
          else if (r < 0.66) { ctx.loseHpDirect(6); ctx.notify('Poison! Lost 6 HP.'); }
          else { ctx.addCardToDeck('neutralize', false); ctx.notify('Strange knowledge...'); }
        },
        result: 'You munch the mushrooms...'
      },
      {
        text: 'Leave them',
        effect() {},
        result: 'Probably wise.'
      }
    ]
  },
  {
    id: 'the_merchant',
    title: 'Shady Merchant',
    icon: '🤑',
    desc: 'A shifty-eyed merchant offers you a deal you cannot refuse.',
    choices: [
      {
        text: 'Buy a random relic (150 gold)',
        condition: ctx => ctx.getGold() >= 150,
        effect(ctx) { ctx.spendGold(150); ctx.gainRelicRandom(); },
        result: 'You acquired a mysterious relic.'
      },
      {
        text: 'Buy a random potion (50 gold)',
        condition: ctx => ctx.getGold() >= 50 && ctx.getPotionCount() < 3,
        effect(ctx) { ctx.spendGold(50); ctx.gainPotionRandom(); },
        result: 'You pocket the potion.'
      },
      {
        text: 'Walk away',
        effect() {},
        result: 'You continue without engaging.'
      }
    ]
  },
  {
    id: 'golden_idol',
    title: 'Golden Idol',
    icon: '🗿',
    desc: 'A golden idol sits on a pedestal. It gleams with untold riches.',
    choices: [
      {
        text: 'Take the idol (gain 250 gold, fight 3 Louses)',
        effect(ctx) { ctx.addGold(250); ctx.scheduleEncounter(['louse_red', 'louse_green', 'louse_red']); },
        result: 'You grab the idol and run!'
      },
      {
        text: 'Leave it',
        effect() {},
        result: 'You leave the idol untouched.'
      }
    ]
  },
  {
    id: 'ancient_writing',
    title: 'Ancient Writing',
    icon: '📜',
    desc: 'Ancient runes cover the walls of a small chamber.',
    choices: [
      {
        text: 'Elegance — Upgrade a card',
        effect(ctx) { ctx.upgradeCardInDeck(); },
        result: 'The runes grant you wisdom.'
      },
      {
        text: 'Violence — Gain 3 random Attack cards',
        effect(ctx) {
          for (let i = 0; i < 3; i++) {
            const c = ctx.pickRandomCards(1, 'attack', false)[0];
            if (c) ctx.addCardToDeck(c.id, false);
          }
        },
        result: 'Your instincts sharpen.'
      }
    ]
  },
  {
    id: 'cursed_tome',
    title: 'Cursed Tome',
    icon: '📕',
    desc: 'A dark tome pulses with eldritch energy.',
    choices: [
      {
        text: 'Read (take 10 damage, gain a rare card)',
        effect(ctx) {
          ctx.loseHpDirect(10);
          const c = ctx.pickRandomCards(1, 'rare', false)[0];
          if (c) ctx.addCardToDeck(c.id, false);
        },
        result: 'Dark knowledge floods your mind. You lose 10 HP and gain a rare card.'
      },
      {
        text: 'Leave it',
        effect() {},
        result: 'Wisdom prevents a terrible fate.'
      }
    ]
  }
];

/* ============================================================
   POTIONS
============================================================ */
STS.POTIONS = {
  health_potion: {
    id: 'health_potion', name: 'Health Potion', icon: '🧪',
    desc: 'Heal 50% of your max HP.',
    useInCombat: true, useOnMap: true,
    use(ctx) { ctx.healHp(Math.floor(ctx.getPlayer().maxHp * 0.5)); }
  },
  fire_potion: {
    id: 'fire_potion', name: 'Fire Potion', icon: '🔥',
    desc: 'Deal 20 damage to target.',
    useInCombat: true, useOnMap: false, needsTarget: true,
    use(ctx, ti) { ctx.attackPotion(ti, 20); }
  },
  strength_potion: {
    id: 'strength_potion', name: 'Strength Potion', icon: '💪',
    desc: 'Gain 3 Strength for this combat.',
    useInCombat: true, useOnMap: false,
    use(ctx) { ctx.status('player', 'strength', 3); }
  },
  block_potion: {
    id: 'block_potion', name: 'Block Potion', icon: '🛡️',
    desc: 'Gain 12 Block.',
    useInCombat: true, useOnMap: false,
    use(ctx) { ctx.block(12); }
  },
  poison_potion: {
    id: 'poison_potion', name: 'Poison Potion', icon: '☠️',
    desc: 'Apply 6 Poison to target.',
    useInCombat: true, useOnMap: false, needsTarget: true,
    use(ctx, ti) { ctx.status(ti, 'poison', 6); }
  },
  energy_potion: {
    id: 'energy_potion', name: 'Energy Potion', icon: '⚡',
    desc: 'Gain 2 Energy.',
    useInCombat: true, useOnMap: false,
    use(ctx) { ctx.gainEnergy(2); }
  },
  card_draw_potion: {
    id: 'card_draw_potion', name: 'Card Draw Potion', icon: '🃏',
    desc: 'Draw 3 cards.',
    useInCombat: true, useOnMap: false,
    use(ctx) { ctx.draw(3); }
  },
  dexterity_potion: {
    id: 'dexterity_potion', name: 'Dexterity Potion', icon: '🏃',
    desc: 'Gain 2 Dexterity for this combat.',
    useInCombat: true, useOnMap: false,
    use(ctx) { ctx.status('player', 'dexterity', 2); }
  }
};

/* ============================================================
   SHOP ITEMS (card costs, relic costs, potion costs, remove cost)
============================================================ */
STS.SHOP = {
  cardCost: { common: 75, uncommon: 145, rare: 200, colorless: 90 },
  relicCost: { common: 150, uncommon: 250, rare: 300, shop: 200 },
  potionCost: 50,
  removeCost: 75,
  relicPool: ['vajra', 'anchor', 'lantern', 'bronze_scales', 'centennial_puzzle',
              'bag_of_marbles', 'blood_vial', 'oddly_smooth_stone', 'pen_nib',
              'akabeko', 'orichalcum', 'meat_on_the_bone', 'gremlin_horn',
              'ice_cream', 'letters_from_nowhere', 'nunchaku']
};

# Spire of Shadows — Roguelike Deckbuilder

> **Model:** Claude Sonnet 4.5 (Anthropic)

A browser-based roguelike deckbuilder inspired by Slay the Spire. Build your deck, slay monsters, collect relics, and conquer all three Acts of the Spire.

## 🎮 How to Play

**Option 1: Open locally**
```
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

**Option 2: GitHub Pages**  
Enable Pages on the `main` or `copilot/create-game-like-slay-the-spire` branch.

## ⚔️ Game Features

### Characters
| Character | HP | Specialty |
|---|---|---|
| ⚔️ Ironclad | 80 | Strength, Exhaust mechanics |
| 🗡️ Silent | 70 | Poison, Shiv cards |

### Core Mechanics
- **Turn-based card combat** — Draw 5 cards, spend Energy to play them
- **Block system** — Block resets each turn (unless Barricade relic)
- **Status effects** — Vulnerable, Weak, Strength, Dexterity, Poison, Thorns, Ritual, Burn…
- **Enemy intents** — Know what enemies will do before they act
- **Deck building** — Choose 1 of 3 cards after each combat

### Game Content
- 🃏 **75+ cards** across both characters and colorless cards
- 👾 **30 enemies** across 3 Acts (including 7 unique bosses)
- 💎 **27 relics** with powerful passive effects
- ❓ **8 random events** with meaningful choices
- 🧪 **8 potions** for tactical use
- 🗺️ **Procedurally generated map** with branching paths

### Node Types
| Icon | Type | Description |
|---|---|---|
| ⚔️ | Monster | Normal combat |
| 💀 | Elite | Tough combat with relic reward |
| 🔥 | Rest Site | Heal or upgrade a card |
| 💰 | Shop | Buy cards, relics, potions |
| 🎁 | Treasure | Free relic |
| ❓ | Event | Random event with choices |
| 👹 | Boss | End-of-act boss fight |

### Acts
- **Act 1** — Cultists, Slime creatures, the Spire's outer defenses
- **Act 2** — Chosen, Byrds, Automatons — the Spire's inner sanctum  
- **Act 3** — Spire Guardians and Archers — the final ascent

## ⌨️ Controls

- **Click cards** to play them (target enemies by clicking them first for attacks)
- **E key** — End your turn
- **End Turn button** — End your turn
- **Click deck/discard counters** — View piles
- **Click relics/status badges** — View descriptions

## 🏗️ Project Structure

```
index.html        — Game entry point
style.css         — All styling (dark fantasy theme)
js/
  data.js         — All game data (cards, enemies, relics, events, potions)
  map.js          — Procedural map generation
  combat.js       — Combat engine (damage calc, status effects, AI)
  game.js         — Game state machine (all screens and transitions)
  ui.js           — UI rendering (all screens, overlays, tooltips)
  main.js         — Entry point and keyboard shortcuts
```


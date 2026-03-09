# How to Add a New Game

This guide explains how to add a new game to the Puzzle Hub platform.

## Prerequisites

- Familiarity with TypeScript
- Understanding of the Game SDK interfaces

## Step-by-Step Guide

### 1. Create Game Module Directory

```
lib/games/your-game/
├── engine.ts       # Game logic
├── ruleset.ts      # Configuration
├── ui-adapter.ts   # State to render model
├── definition.ts   # Game registration
├── index.ts        # Exports
└── __tests__/
    └── engine.test.ts
```

### 2. Define Ruleset (ruleset.ts)

```typescript
export const YOUR_GAME_RULESET_VERSION = '1.0.0';

export const YOUR_GAME_MODES = {
  standard: {
    // mode-specific params
  },
} as const;
```

### 3. Implement Engine (engine.ts)

```typescript
import type { GameEngine, BaseGameState, GameParams } from '../sdk/types';

export interface YourGameParams extends GameParams {
  // your params
}

export interface YourGameState extends BaseGameState {
  // your state
}

export interface YourGameAction {
  type: 'your_action';
  // action data
}

export const yourGameEngine: GameEngine<YourGameState, YourGameAction, YourGameParams> = {
  init(seed, params) { /* ... */ },
  applyAction(state, action) { /* ... */ },
  isTerminal(state) { /* ... */ },
  getScore(state, durationMs) { /* ... */ },
  getSummary(state) { /* ... */ },
  verify(seed, params, actions) { /* ... */ },
};
```

### 4. Create UI Adapter (ui-adapter.ts)

```typescript
import type { UIAdapter, RenderModel } from '../sdk/types';

export const yourGameUIAdapter: UIAdapter<YourGameState> = {
  toRenderModel(state) {
    return {
      status: state.status,
      isTerminal: state.status !== 'playing',
      data: { /* your render data */ },
    };
  },
  getInputConfig() {
    return { type: 'custom' };
  },
};
```

### 5. Create Game Definition (definition.ts)

```typescript
import type { GameDefinition } from '../sdk/types';

export const yourGameDefinition: GameDefinition<...> = {
  gameId: 'your-game',
  displayName: 'Your Game',
  description: 'Description here',
  icon: 'GamepadIcon',
  modes: [/* ... */],
  rulesetVersions: ['1.0.0'],
  currentRulesetVersion: '1.0.0',
  engine: yourGameEngine,
  uiAdapter: yourGameUIAdapter,
  isEnabled: true,
};
```

### 6. Register in Registry

Edit `lib/games/sdk/registry.ts`:

```typescript
import { yourGameDefinition } from '../your-game/definition';

export const GAMES: Record<string, GameDefinition> = {
  'mastermind': mastermindDefinition,
  'your-game': yourGameDefinition,  // Add here
};
```

### 7. Create UI Component

Create `components/YourGame.tsx` following the Mastermind example.

### 8. Add Route

Create `app/your-game/page.tsx`:

```typescript
import YourGame from "@/components/YourGame";

export default function YourGamePage() {
  return <YourGame />;
}
```

### 9. Add to Hub Page

Edit `app/page.tsx` and add your game to the `GAMES` array.

### 10. Add Database Entry

```sql
INSERT INTO games (game_id, display_name, description, metadata) VALUES
  ('your-game', 'Your Game', 'Description', '{"icon": "YourIcon"}');
```

### 11. Write Tests

Create `lib/games/your-game/__tests__/engine.test.ts` with tests for your game logic.

## Checklist

- [ ] Engine implements all GameEngine methods
- [ ] Engine is pure and deterministic
- [ ] Same seed produces same initial state
- [ ] Tests cover edge cases
- [ ] UI adapter provides all needed render data
- [ ] Registered in SDK registry
- [ ] Route created
- [ ] Added to hub page
- [ ] Database entry added

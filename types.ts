export enum GameState {
  MENU = 'MENU',
  GENERATING = 'GENERATING',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facingRight: boolean;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'ground' | 'brick' | 'block' | 'pipe';
}

export interface Coin {
  x: number;
  y: number;
  width: number;
  height: number;
  collected: boolean;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  type: 'goomba';
  dead: boolean;
}

export interface LevelData {
  platforms: Platform[];
  coins: Coin[];
  enemies: Enemy[];
  finishLineX: number;
}
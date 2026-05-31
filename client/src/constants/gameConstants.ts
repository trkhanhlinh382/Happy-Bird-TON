// gameConstants.ts

export const CANVAS_WIDTH = 360
export const CANVAS_HEIGHT = 560
export const GROUND_HEIGHT = 92
export const BIRD_X = 100
export const BIRD_RADIUS = 16
export const PIPE_WIDTH = 68
export const PIPE_GAP = Number(import.meta.env.VITE_GAME_PIPE_GAP) || 155
export const PIPE_SPEED = Number(import.meta.env.VITE_GAME_PIPE_SPEED) || 2.8
export const FLAP_FORCE = Number(import.meta.env.VITE_GAME_FLAP_FORCE) || -6.8
export const GRAVITY = Number(import.meta.env.VITE_GAME_GRAVITY) || 0.38
export const BEST_SCORE_KEY = 'happy-bird-ton-best-score'
export const LEADERBOARD_KEY = 'happy-bird-ton-leaderboard'

/* Stable background assets coordinates for parallax effect */
export const STARS = [
  { x: 25, y: 40, s: 1.5, p: 0.5 },
  { x: 85, y: 110, s: 1, p: 1.2 },
  { x: 145, y: 65, s: 2, p: 2.8 },
  { x: 215, y: 150, s: 1.2, p: 0.7 },
  { x: 285, y: 85, s: 1.8, p: 2.1 },
  { x: 340, y: 130, s: 1.5, p: 1.5 },
  { x: 45, y: 230, s: 1, p: 4.2 },
  { x: 115, y: 270, s: 2, p: 0.4 },
  { x: 185, y: 220, s: 1.2, p: 2.5 },
  { x: 255, y: 190, s: 1.5, p: 3.6 },
  { x: 315, y: 250, s: 1, p: 1.8 },
  { x: 20, y: 340, s: 1.8, p: 0.2 },
  { x: 90, y: 380, s: 1.2, p: 3.1 },
  { x: 170, y: 330, s: 2, p: 1.6 },
  { x: 240, y: 370, s: 1.5, p: 3.9 },
]

export const BUILDINGS = [
  { x: 0, w: 45, h: 100 },
  { x: 45, w: 60, h: 160 },
  { x: 105, w: 35, h: 80 },
  { x: 140, w: 55, h: 120 },
  { x: 195, w: 50, h: 190 },
  { x: 245, w: 40, h: 90 },
  { x: 285, w: 75, h: 140 },
]

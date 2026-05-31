// gameHelpers.ts
import { CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_HEIGHT } from '../constants/gameConstants'

export type Pipe = {
  x: number
  gapY: number
  passed: boolean
}

export function shortAddress(address: string): string {
  if (address.length <= 12) {
    return address
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function getSpeedMultiplier(score: number): number {
  return 1 + Math.min(score, 80) * 0.022
}

export function randomPipeY(): number {
  const min = 150
  const max = CANVAS_HEIGHT - GROUND_HEIGHT - 150
  return min + Math.random() * (max - min)
}

export function createPipe(offset = 0): Pipe {
  return {
    x: CANVAS_WIDTH + offset,
    gapY: randomPipeY(),
    passed: false,
  }
}

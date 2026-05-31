// storage.ts
import { BEST_SCORE_KEY, LEADERBOARD_KEY } from '../constants/gameConstants'

export type LeaderboardEntry = {
  player: string
  bestScore: number
  updatedAt: number
}

export function getStoredBestScore(): number {
  const storedBest = window.localStorage.getItem(BEST_SCORE_KEY)
  const parsedBest = storedBest ? Number.parseInt(storedBest, 10) : 0

  return Number.isNaN(parsedBest) ? 0 : parsedBest
}

export function getStoredLeaderboard(): LeaderboardEntry[] {
  const stored = window.localStorage.getItem(LEADERBOARD_KEY)

  if (!stored) {
    return [] as LeaderboardEntry[]
  }

  try {
    const parsed = JSON.parse(stored)

    if (!Array.isArray(parsed)) {
      return [] as LeaderboardEntry[]
    }

    return parsed
      .filter((item): item is LeaderboardEntry => {
        return (
          typeof item === 'object' &&
          item !== null &&
          typeof item.player === 'string' &&
          typeof item.bestScore === 'number' &&
          typeof item.updatedAt === 'number'
        )
      })
      .sort((a, b) => b.bestScore - a.bestScore || b.updatedAt - a.updatedAt)
  } catch {
    return [] as LeaderboardEntry[]
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries))
}

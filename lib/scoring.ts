// Shared by the challenge UI and the attempts API so both compute the same score.

export const WRONG_CHECK_PENALTY = 10
export const HINT_PENALTY = 15

export function computeScore({ wrongChecks, hints }: { wrongChecks: number; hints: number }) {
  return Math.max(0, 100 - wrongChecks * WRONG_CHECK_PENALTY - hints * HINT_PENALTY)
}

export function starsFor(score: number) {
  return score >= 90 ? 3 : score >= 70 ? 2 : 1
}

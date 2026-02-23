/**
 * Elo Rating System — BeliAche bathroom comparisons
 *
 * Standard Elo formula:
 *   Expected score:  Eₐ = 1 / (1 + 10^((Rᵦ − Rₐ) / 400))
 *   Rating update:   Rₐ' = Rₐ + K × (Sₐ − Eₐ)
 *
 * Outcome scores (Sₐ):
 *   Win  → 1.0
 *   Tie  → 0.5
 *   Loss → 0.0
 *
 * Dynamic K-factor (learning rate) — higher K = faster movement:
 *   < 10 comparisons  → K = 64  (new bathrooms learn fast)
 *   < 30 comparisons  → K = 48
 *   30+ comparisons   → K = 32  (stable, well-established)
 *
 * The 400-point divisor is the standard Elo scaling constant:
 * a 400-point gap means the stronger item wins ~91% of the time.
 */

export const DEFAULT_ELO = 1200

/** Dynamic K-factor based on how many comparisons a bathroom has seen. */
function kFactor(comparisons: number): number {
  if (comparisons < 10) return 64
  if (comparisons < 30) return 48
  return 32
}

/**
 * Probability that A beats B given their current ratings.
 * Returns a value in (0, 1).
 */
export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400))
}

export interface EloResult {
  newRatingA: number
  newRatingB: number
  /** Integer points gained/lost by A (positive = gained) */
  deltaA: number
  /** Integer points gained/lost by B */
  deltaB: number
}

/**
 * Calculate updated Elo ratings after one comparison.
 *
 * @param ratingA      Current Elo of bathroom A
 * @param ratingB      Current Elo of bathroom B
 * @param comparisonsA How many comparisons A has had (for K-factor)
 * @param comparisonsB How many comparisons B has had (for K-factor)
 * @param outcome      'a' = A wins, 'b' = B wins, 'tie' = draw
 */
export function calculateElo(
  ratingA: number,
  ratingB: number,
  comparisonsA: number,
  comparisonsB: number,
  outcome: "a" | "b" | "tie"
): EloResult {
  const eA = expectedScore(ratingA, ratingB) // prob A beats B
  const eB = expectedScore(ratingB, ratingA) // prob B beats A (= 1 − eA)

  const sA = outcome === "a" ? 1 : outcome === "tie" ? 0.5 : 0
  const sB = outcome === "b" ? 1 : outcome === "tie" ? 0.5 : 0

  const kA = kFactor(comparisonsA)
  const kB = kFactor(comparisonsB)

  // Round to integers — fractional Elo points are meaningless at this scale
  const deltaA = Math.round(kA * (sA - eA))
  const deltaB = Math.round(kB * (sB - eB))

  return {
    newRatingA: ratingA + deltaA,
    newRatingB: ratingB + deltaB,
    deltaA,
    deltaB,
  }
}

/**
 * Score a candidate pair for prioritization (lower = better matchup to show).
 *
 * Factors:
 *  - Elo gap: pairs with close ratings are more informative (uncertain outcome)
 *  - Comparison count: pairs with fewer total comparisons need more data
 */
export function pairScore(
  ratingA: number,
  ratingB: number,
  comparisonsA: number,
  comparisonsB: number
): number {
  const eloDiff = Math.abs(ratingA - ratingB)
  const avgComparisons = (comparisonsA + comparisonsB) / 2
  // Weight: close Elo gap (max ~400) + low comparison count bias
  return eloDiff + avgComparisons * 5
}

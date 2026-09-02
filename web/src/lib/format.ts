/* Display formatting.
 *
 * One place for these so the study list, the result card, the aria strings
 * and the preview alt text can never drift apart.
 */

/** The store has no filename, so a study is shown as `Case_{id}`.
 *  Defined once here — the list, the panel heading and the aria labels all
 *  read from it, so they cannot disagree. */
export function caseLabel(id: string): string {
  return `Case_${id}`;
}

/** 0.87 -> "87.0". Always one decimal place. */
export function formatPercent(probability: number): string {
  return (probability * 100).toFixed(1);
}

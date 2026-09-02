import ConfidenceBar from "./ConfidenceBar";
import { formatPercent } from "../lib/format";
import type { Prediction } from "../lib/types";

/* The verdict.
 *
 * Rendered only when phase === "done" and a result exists — never beside an
 * error. The verdict is stated three redundant ways so hue is never
 * load-bearing: the word, the uppercase badge, and the numeric probability.
 * The disclaimer is unconditional. */

interface ResultCardProps {
  result: Prediction;
}

const DISCLAIMER = "Research use only — not a clinical diagnosis.";

export default function ResultCard({ result }: ResultCardProps) {
  const { label, positive, probability } = result;
  const pct = formatPercent(probability);

  return (
    <section
      className={`result ${positive ? "result--pos" : "result--neg"}`}
      role="status"
      aria-live="polite"
    >
      <div className="result__head">
        <div>
          <span className="result__verdict">
            {label || (positive ? "Pneumonia" : "Normal")}
          </span>
          <span className="result__badge">
            {positive ? "POSITIVE FINDING" : "NO FINDING"}
          </span>
        </div>
        <span className="result__prob">{pct}% pneumonia probability</span>
      </div>

      <ConfidenceBar probability={probability} positive={positive} />

      <p className="result__disclaimer">{DISCLAIMER}</p>
    </section>
  );
}

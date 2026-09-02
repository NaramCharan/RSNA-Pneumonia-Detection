import { formatPercent } from "../lib/format";

/* The probability bar inside the ResultCard.
 *
 * It always plots the PNEUMONIA probability, so a Normal verdict shows a short
 * blue bar. That is intentional — the readout beside it names the quantity. */

interface ConfidenceBarProps {
  /** 0..1, already clamped by api.ts. */
  probability: number;
  positive: boolean;
}

export default function ConfidenceBar({ probability, positive }: ConfidenceBarProps) {
  const pct = Math.min(Math.max(probability, 0), 1) * 100;

  return (
    <div
      className="bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={`${formatPercent(probability)} percent pneumonia probability`}
    >
      <div
        className={`bar__fill bar__fill--${positive ? "pos" : "neg"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

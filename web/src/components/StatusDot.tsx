import type { Health } from "../lib/types";

/* Backend health indicator.
 *
 * Three states, and every one is a dot PLUS a text string — the dot is never
 * the only cue. Nothing here is red or blue: health is a system condition, not
 * a verdict, so "online" is green and "offline" is amber. Red and blue stay
 * reserved for what the model said. */

interface StatusDotProps {
  health: Health;
}

const TEXT: Record<Health, string> = {
  checking: "Checking backend…",
  online: "Model online",
  offline: "Backend unreachable",
};

export default function StatusDot({ health }: StatusDotProps) {
  return (
    <div className="status" role="group" aria-label="Backend status">
      <span className={`status__dot status__dot--${health}`} aria-hidden="true" />
      <span className={`status__text status__text--${health}`} aria-live="polite">
        {TEXT[health]}
      </span>
    </div>
  );
}

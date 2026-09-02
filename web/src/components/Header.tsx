import StatusDot from "./StatusDot";
import type { Health } from "../lib/types";

/* Top bar: lungs mark, title, mono subtitle, and the right-aligned health
 * cluster. Pure — no state of its own.
 *
 * The mark is inline SVG rather than CSS pseudo-elements: the previous
 * version sized its bars with `inset`, which collapsed them to 0px inside
 * the 24px box and rendered an empty ring. */

interface HeaderProps {
  health: Health;
}

export default function Header({ health }: HeaderProps) {
  return (
    <header className="header">
      {/* Decorative — the title carries the meaning, so it is hidden from
          assistive tech rather than given a label. */}
      <svg
        className="mark"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* trachea */}
        <path d="M12 3.5v7.5" />
        {/* carina — the split into each main bronchus */}
        <path d="M12 11c-.6-1.1-1.7-1.6-2.8-1.3" />
        <path d="M12 11c.6-1.1 1.7-1.6 2.8-1.3" />
        {/* lungs */}
        <path d="M9.2 9.7C7.4 10.4 5.5 13 5.1 16.4c-.2 1.9.6 3.4 2 3.9 1.6.5 3.1-.6 3.6-2.4.3-1.1.4-2.3.4-3.6V11" />
        <path d="M14.8 9.7c1.8.7 3.7 3.3 4.1 6.7.2 1.9-.6 3.4-2 3.9-1.6.5-3.1-.6-3.6-2.4-.3-1.1-.4-2.3-.4-3.6V11" />
      </svg>

      <div className="header__titles">
        <h1 className="header__title">Pneumonia Detection</h1>
        <p className="header__subtitle">RSNA chest radiograph screening</p>
      </div>

      <StatusDot health={health} />
    </header>
  );
}

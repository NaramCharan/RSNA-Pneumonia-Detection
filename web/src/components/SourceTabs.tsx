import type { Source } from "../lib/types";

/* Stored / Upload switch in the StudyPanel head.
 *
 * A real tablist: roving tabindex, arrow keys move and activate, and
 * aria-selected marks the current one. Deliberately colourless — colour in
 * this app means a verdict, never a UI state. */

interface SourceTabsProps {
  source: Source;
  disabled: boolean;
  onChange: (next: Source) => void;
}

const TABS: { value: Source; label: string }[] = [
  { value: "stored", label: "Stored" },
  { value: "upload", label: "Upload" },
];

export default function SourceTabs({ source, disabled, onChange }: SourceTabsProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;
    const i = TABS.findIndex((t) => t.value === source);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onChange(TABS[(i + 1) % TABS.length].value);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      onChange(TABS[(i - 1 + TABS.length) % TABS.length].value);
    }
  }

  return (
    <div className="tabs" role="tablist" aria-label="Study source" onKeyDown={handleKeyDown}>
      {TABS.map((tab) => {
        const active = tab.value === source;
        return (
          <button
            key={tab.value}
            id={`tab-${tab.value}`}
            type="button"
            role="tab"
            className={`tab${active ? " is-active" : ""}`}
            aria-selected={active}
            aria-controls="study-list"
            tabIndex={active ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

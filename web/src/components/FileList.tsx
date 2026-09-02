import type { KeyboardEvent } from "react";

/* The study list.
 *
 * A real listbox: arrow keys / Home / End move the selection, Enter and Space
 * re-confirm it, and aria-activedescendant tells assistive tech which row is
 * current. Selection is carried by four cues at once — a left marker bar, a
 * border, a fill, and bold text — so it never depends on colour. */

/** One row's worth of data, mapped by the caller from SampleItem[]. */
export interface FileListItem {
  /** React key — the study id. */
  key: string;
  /** Display text, e.g. "Case_b7f3c2e1". */
  label: string;
}

interface FileListProps {
  items: FileListItem[];
  selected: number | null;
  /** Shown in place of the list when there is nothing to show — see §5.2. */
  emptyMessage: string;
  loading: boolean;
  /** True while a prediction is running. */
  disabled: boolean;
  onSelect: (index: number) => void;
}

export default function FileList({
  items,
  selected,
  emptyMessage,
  loading,
  disabled,
  onSelect,
}: FileListProps) {
  // Empty and loading share one presentation: a single centred line of copy.
  if (items.length === 0) {
    return (
      <p className="empty" aria-busy={loading}>
        {emptyMessage}
      </p>
    );
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    // Selection does not wrap: Down on the last row stays on the last row.
    const last = items.length - 1;
    const current = selected ?? -1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        onSelect(Math.min(current + 1, last));
        break;
      case "ArrowUp":
        event.preventDefault();
        onSelect(current <= 0 ? 0 : current - 1);
        break;
      case "Home":
        event.preventDefault();
        onSelect(0);
        break;
      case "End":
        event.preventDefault();
        onSelect(last);
        break;
      case "Enter":
      case " ":
        // Re-confirm the current row (re-running clears any stale result).
        if (selected !== null) {
          event.preventDefault();
          onSelect(selected);
        }
        break;
      default:
        break;
    }
  }

  return (
    <ul
      className={`filelist${disabled ? " is-disabled" : ""}`}
      role="listbox"
      aria-label="Studies"
      tabIndex={0}
      aria-activedescendant={selected !== null ? `study-${selected}` : undefined}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => (
        <FileRow
          key={item.key}
          item={item}
          index={index}
          selected={index === selected}
          onSelect={onSelect}
        />
      ))}
    </ul>
  );
}

/* ── one row ────────────────────────────────────────────────────────── */

interface FileRowProps {
  item: FileListItem;
  index: number;
  selected: boolean;
  onSelect: (index: number) => void;
}

function FileRow({ item, index, selected, onSelect }: FileRowProps) {
  // Keyboard interaction lives on the parent <ul> (the listbox), which is what
  // the ARIA listbox pattern asks for — the rows themselves are not focusable.
  return (
    <li
      id={`study-${index}`}
      className={`file${selected ? " is-selected" : ""}`}
      role="option"
      aria-selected={selected}
      aria-label={`Study ${index + 1}, ${item.label}`}
      title={item.label}
      onClick={() => onSelect(index)}
    >
      <span className="file__idx">{String(index + 1).padStart(2, "0")}</span>
      <span className="file__name">{item.label}</span>
    </li>
  );
}

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import SourceTabs from "./SourceTabs";
// Aliased on import so the DOM's `FileList` type stays visible in this file.
import FileListView from "./FileList";
import type { FileListItem } from "./FileList";
import type { SampleItem, Source } from "../lib/types";
import { caseLabel } from "../lib/format";

/* Left column: pick a study.
 *
 * Head = title + source tabs, body = the list, foot = Browse + drop hint
 * (Upload source only). The whole panel is the drop target. The only state
 * kept here is `dragging`, which is purely visual. */

interface StudyPanelProps {
  source: Source;
  samples: SampleItem[];
  localFiles: File[];
  loading: boolean;
  error: string | null;
  selected: number | null;
  /** True while a request is in flight. */
  disabled: boolean;
  onSourceChange: (next: Source) => void;
  onSelect: (index: number) => void;
  onFilesAdded: (files: FileList) => void;
}

const EMPTY_STORED = "No studies in storage.";
const EMPTY_STORED_LOADING = "Loading studies…";
const EMPTY_STORED_ERROR = "Could not load studies.";
const EMPTY_UPLOAD = "No DICOM files added.";

export default function StudyPanel({
  source,
  samples,
  localFiles,
  loading,
  error,
  selected,
  disabled,
  onSourceChange,
  onSelect,
  onFilesAdded,
}: StudyPanelProps) {
  const [dragging, setDragging] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);

  const isUpload = source === "upload";

  // Both sources flatten to the same row shape. Stored studies have no
  // filename, so they are labelled from their id.
  const items: FileListItem[] = isUpload
    ? localFiles.map((file, i) => ({ key: `${i}-${file.name}-${file.size}`, label: file.name }))
    : samples.map((sample) => ({ key: sample.id, label: caseLabel(sample.id) }));

  const emptyMessage = isUpload
    ? EMPTY_UPLOAD
    : loading
      ? EMPTY_STORED_LOADING
      : error
        ? EMPTY_STORED_ERROR
        : EMPTY_STORED;

  /* ── drag & drop (Upload source only) ────────────────────────────── */

  const dropEnabled = isUpload && !disabled;

  function handleDragOver(event: DragEvent<HTMLElement>) {
    if (!dropEnabled) return;
    event.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    if (!dropEnabled) return;
    event.preventDefault();
    // Ignore leave events fired while moving between children.
    const next = event.relatedTarget;
    if (next instanceof Node && event.currentTarget.contains(next)) return;
    setDragging(false);
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    if (!dropEnabled) return;
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) onFilesAdded(event.dataTransfer.files);
  }

  return (
    <section
      className={`panel study-panel${dragging ? " is-dragging" : ""}${
        disabled ? " is-busy" : ""
      }`}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="panel-head">
        <h2 className="panel-title">Studies</h2>
        <SourceTabs source={source} disabled={disabled} onChange={onSourceChange} />
      </div>

      {/* The tabs' aria-controls target. Stays in the DOM even when the list
          is empty, which an id on the <ul> itself would not. */}
      <div
        className="panel-body"
        id="study-list"
        role="tabpanel"
        aria-labelledby={isUpload ? "tab-upload" : "tab-stored"}
      >
        <FileListView
          items={items}
          selected={selected}
          emptyMessage={emptyMessage}
          loading={loading && !isUpload}
          disabled={disabled}
          onSelect={onSelect}
        />
      </div>

      {isUpload && (
        <div className="panel-foot">
          <button
            type="button"
            className="btn btn--ghost"
            disabled={disabled}
            onClick={() => pickerRef.current?.click()}
          >
            Browse DICOM…
          </button>

          <span className="hint">
            {dragging ? (
              "Drop to add .dcm files"
            ) : (
              <>
                or drop <code>.dcm</code> files here
              </>
            )}
          </span>

          <input
            ref={pickerRef}
            type="file"
            accept=".dcm,application/dicom"
            multiple
            hidden
            onChange={(event) => {
              const { files } = event.target;
              if (files && files.length > 0) onFilesAdded(files);
              // Reset so picking the same file again still fires a change.
              event.target.value = "";
            }}
          />
        </div>
      )}
    </section>
  );
}

import { formatPercent } from "../lib/format";
import type { Phase } from "../lib/types";

/* The lightbox.
 *
 * Shows the radiograph when one has been loaded — either from GET /image/{id}
 * ("Show Image") or from the base64 preview that came back with an upload's
 * prediction. Otherwise a film placeholder, plus a sweeping scanline while a
 * request is in flight.
 *
 * The scanline is deliberately neutral grey: a blue sweep would read as a
 * provisional "clear" verdict before the model has answered. The image border
 * is tinted only once a verdict exists — `positive` is undefined for a plain
 * image view, which leaves the border neutral. */

interface ViewportProps {
  phase: Phase;
  /** A /image/{id} URL or a data: URL. Null when nothing is loaded. */
  imageSrc: string | null;
  imageLoading: boolean;
  /** Undefined when there is no verdict yet — border stays neutral. */
  positive?: boolean;
  hasStudies: boolean;
  hasSelection: boolean;
  /** False for uploads — they have no /image/{id}, so the copy must not tell
   *  the user to press a button that is disabled. */
  canShowImage: boolean;
  /** Only used to spell the verdict out in the image's alt text. */
  label?: string;
  probability?: number;
  /** The <img> is the only thing that knows when a /image/{id} request has
   *  actually finished or failed, so it reports both back to App. */
  onImageLoad: () => void;
  onImageError: () => void;
}

const PH_NO_STUDIES = "No studies loaded.";
const PH_NO_SELECTION = "Select a study to begin.";
const PH_READY = "Press Show Image, or Predict.";
const PH_READY_UPLOAD = "Press Predict.";
const PH_BUSY = "Analyzing…";
const PH_IMAGE_LOADING = "Loading image…";
const PH_NO_PREVIEW = "No image returned by the backend.";
const PH_ERROR = "Analysis did not complete.";

export default function Viewport({
  phase,
  imageSrc,
  imageLoading,
  positive,
  hasStudies,
  hasSelection,
  canShowImage,
  label,
  probability,
  onImageLoad,
  onImageError,
}: ViewportProps) {
  const busy = phase === "busy";

  if (imageSrc) {
    // The border colour is invisible to a screen reader, so the alt text says
    // the verdict in words — when there is one.
    const pct = probability === undefined ? "" : formatPercent(probability);
    const alt =
      label && pct
        ? `Chest radiograph. Model verdict: ${label}, ${pct}% pneumonia probability.`
        : "Chest radiograph.";

    // No verdict yet -> no tint, just the neutral frame.
    const tint =
      positive === undefined ? "" : positive ? " preview--pos" : " preview--neg";

    return (
      <div className="viewport">
        {/* Until the bytes arrive the <img> has nothing to show, so the
            placeholder stands in rather than a blank frame. */}
        {imageLoading && (
          <div className="placeholder is-dimmed">
            <div className="ph-mark" aria-hidden="true" />
            <p className="ph-text">{PH_IMAGE_LOADING}</p>
          </div>
        )}

        <img
          className={`preview${tint}${imageLoading ? " is-hidden" : ""}`}
          src={imageSrc}
          alt={alt}
          onLoad={onImageLoad}
          onError={onImageError}
        />

        {(busy || imageLoading) && <div className="scanline" aria-hidden="true" />}
      </div>
    );
  }

  return (
    <div className="viewport">
      <div className={`placeholder${busy || imageLoading ? " is-dimmed" : ""}`}>
        <div className="ph-mark" aria-hidden="true" />
        <p className="ph-text">
          {placeholderCopy(phase, imageLoading, hasStudies, hasSelection, canShowImage)}
        </p>
      </div>

      {/* Decorative only — the busy state is announced by a live region. */}
      {(busy || imageLoading) && <div className="scanline" aria-hidden="true" />}
    </div>
  );
}

/** Which line of copy sits under the film mark. */
function placeholderCopy(
  phase: Phase,
  imageLoading: boolean,
  hasStudies: boolean,
  hasSelection: boolean,
  canShowImage: boolean,
) {
  if (imageLoading) return PH_IMAGE_LOADING;
  if (phase === "busy") return PH_BUSY;
  if (phase === "error") return PH_ERROR;
  // A finished run with no image means the backend sent no preview.
  if (phase === "done") return PH_NO_PREVIEW;
  if (!hasStudies) return PH_NO_STUDIES;
  if (!hasSelection) return PH_NO_SELECTION;
  return canShowImage ? PH_READY : PH_READY_UPLOAD;
}

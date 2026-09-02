import Viewport from "./Viewport";
import ResultCard from "./ResultCard";
import type { Health, Phase, Prediction } from "../lib/types";

/* Right column: view the radiograph, run inference, show the answer.
 *
 * Purely presentational — App owns every piece of state below.
 *
 * The rule that shapes this file: a failed prediction must never look like a
 * negative result. So the error lives in the FOOTER, in amber, prefixed with
 * "failed", and the ResultCard is unmounted whenever an error is on screen. */

interface AnalysisPanelProps {
  selectedName: string | null;
  /** Whether the active source has any studies at all — the Viewport needs it
   *  to choose between "No studies" and "Select a study". */
  hasStudies: boolean;
  phase: Phase;
  result: Prediction | null;
  /** What the viewport is displaying: a GET /image/{id} URL, or the base64
   *  preview that came back with an upload's prediction. */
  imageSrc: string | null;
  imageLoading: boolean;
  /** False for uploaded files: with no id there is no /image/{id} to call. */
  canShowImage: boolean;
  error: string | null;
  /** Non-fatal message shown beside the buttons. */
  notice: string | null;
  /** Part of the documented props; the buttons stay enabled when the backend
   *  is offline, because a real error message beats a dead button. */
  health: Health;
  onShowImage: () => void;
  onPredict: () => void;
  /** Forwarded to the <img> — only it knows when the bytes have arrived. */
  onImageLoad: () => void;
  onImageError: () => void;
}

const CTA_IDLE = "Predict";
const CTA_BUSY = "Analyzing…";
const SHOW_IDLE = "Show Image";
const SHOW_BUSY = "Loading…";
const NO_SELECTION = "No study selected";

export default function AnalysisPanel({
  selectedName,
  hasStudies,
  phase,
  result,
  imageSrc,
  imageLoading,
  canShowImage,
  error,
  notice,
  onShowImage,
  onPredict,
  onImageLoad,
  onImageError,
}: AnalysisPanelProps) {
  const busy = phase === "busy";
  const hasSelection = selectedName !== null;

  // Both actions need a study; neither may run while something is in flight.
  const inFlight = busy || imageLoading;
  const predictDisabled = inFlight || !hasSelection;
  const showDisabled = inFlight || !hasSelection || !canShowImage;

  // Errors win over notices; a result and an error are never both on screen.
  const statusText = error ?? notice;
  const showResult = phase === "done" && result !== null;

  return (
    <section className="panel analysis-panel">
      <div className="panel-head">
        <h2 className="panel-title">Analysis</h2>
        <span className="meta" title={selectedName ?? undefined}>
          {selectedName ?? NO_SELECTION}
        </span>
      </div>

      <Viewport
        phase={phase}
        imageSrc={imageSrc}
        imageLoading={imageLoading}
        // Only a verdict tints the border. A plain "Show Image" view stays
        // neutral — colour in this app always means the model has answered.
        positive={showResult ? result.positive : undefined}
        hasStudies={hasStudies}
        hasSelection={hasSelection}
        canShowImage={canShowImage}
        label={showResult ? result.label : undefined}
        probability={showResult ? result.probability : undefined}
        onImageLoad={onImageLoad}
        onImageError={onImageError}
      />

      {showResult && <ResultCard result={result} />}

      <div className="panel-foot">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={showDisabled}
          aria-busy={imageLoading}
          onClick={onShowImage}
          title={
            hasSelection && !canShowImage
              ? "Uploaded files have no stored image — run Predict instead."
              : undefined
          }
        >
          {imageLoading ? SHOW_BUSY : SHOW_IDLE}
        </button>

        <button
          type="button"
          className="btn btn--primary"
          disabled={predictDisabled}
          aria-busy={busy}
          onClick={onPredict}
        >
          {busy ? CTA_BUSY : CTA_IDLE}
        </button>

        {statusText && (
          <span
            className="statusline statusline--warn"
            role={error ? "alert" : "status"}
          >
            {statusText}
          </span>
        )}
      </div>

      {/* The busy state is announced in text, not by the scanline animation. */}
      <p className="visually-hidden" role="status">
        {busy && selectedName ? `Running inference on ${selectedName}.` : ""}
      </p>
    </section>
  );
}

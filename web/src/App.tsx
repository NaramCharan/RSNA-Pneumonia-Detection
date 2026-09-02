import { useEffect, useState } from "react";
import Header from "./components/Header";
import StudyPanel from "./components/StudyPanel";
import AnalysisPanel from "./components/AnalysisPanel";
import { fetchSamples, imageUrl, predictSample, predictUpload } from "./lib/api";
import { caseLabel } from "./lib/format";
import type { Health, Phase, Prediction, SampleItem, Source } from "./lib/types";

/* The whole application state lives here.
 *
 * No state library and no context: props down, callbacks up. The invariants
 * worth repeating are:
 *
 *   - a result and an error are NEVER on screen together;
 *   - selecting a study, or switching source, always clears the previous
 *     verdict AND the previous image;
 *   - entering "busy" clears the previous result and error first.
 *
 * Two sources, with different capabilities:
 *   stored -> has an id  -> GET /image/{id} and POST /predict/sample/{id}
 *   upload -> only bytes -> POST /predict, image only via the returned preview
 */

/** A dropped/picked file counts as DICOM by extension or MIME type. */
const DICOM_FILE = /\.dcm$/i;

export default function App() {
  const [health, setHealth] = useState<Health>("checking");
  const [source, setSource] = useState<Source>("stored");
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [samplesLoading, setSamplesLoading] = useState(false);
  const [samplesError, setSamplesError] = useState<string | null>(null);
  const [local, setLocal] = useState<File[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  /* ── load the study list once, on mount ────────────────────────────── */

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setSamplesLoading(true);
      setSamplesError(null);
      try {
        const rows = await fetchSamples(controller.signal);
        if (cancelled) return;
        setSamples(rows);
        // There is no /health route, so a successful list IS the health signal.
        setHealth("online");
      } catch (err) {
        if (cancelled) return;
        setSamples([]);
        setSamplesError(messageOf(err, "Could not load studies."));
        setHealth("offline");
      } finally {
        if (!cancelled) setSamplesLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  /* ── derived values ────────────────────────────────────────────────── */

  const isUpload = source === "upload";
  const count = isUpload ? local.length : samples.length;
  const hasSelection = selected !== null && selected < count;

  const selectedStudy = !isUpload && hasSelection ? samples[selected] : undefined;
  const selectedFile = isUpload && hasSelection ? local[selected] : undefined;

  const selectedName = selectedStudy
    ? caseLabel(selectedStudy.id)
    : (selectedFile?.name ?? null);

  // Only a stored study can be fetched by id from GET /image/{id}.
  const canShowImage = selectedStudy !== undefined;

  /* ── handlers ──────────────────────────────────────────────────────── */

  /** Clear everything that describes the previously-viewed study. */
  function clearView() {
    setResult(null);
    setError(null);
    setImageSrc(null);
    setImageLoading(false);
    setPhase("idle");
  }

  /** Switching source is a full reset — no verdict or image may survive it. */
  function handleSourceChange(next: Source) {
    if (next === source) return;
    setSource(next);
    setSelected(null);
    setNotice(null);
    clearView();
  }

  /** Picking a study clears the previous verdict and image. */
  function handleSelect(index: number) {
    setSelected(index);
    clearView();
  }

  /** Files from the picker or a drop. Non-DICOM files are ignored with a
   *  non-fatal notice; the first new file is auto-selected. */
  function handleFilesAdded(files: FileList) {
    const incoming = Array.from(files);
    const dicoms = incoming.filter(
      (file) => DICOM_FILE.test(file.name) || file.type === "application/dicom",
    );
    const skipped = incoming.length - dicoms.length;

    if (dicoms.length === 0) {
      setNotice("Those files are not DICOM (.dcm).");
      return;
    }

    const firstNewIndex = local.length;
    setLocal((previous) => [...previous, ...dicoms]);
    setSelected(firstNewIndex);
    clearView();
    setNotice(
      skipped > 0 ? `${skipped} non-DICOM file${skipped === 1 ? "" : "s"} ignored.` : null,
    );
  }

  /** GET /image/{id} — point the <img> at it and let the browser fetch. */
  function handleShowImage() {
    if (!selectedStudy) return;
    setResult(null);
    setError(null);
    setPhase("idle");
    setImageLoading(true);
    setImageSrc(imageUrl(selectedStudy.id));
  }

  /** The <img> finished decoding. */
  function handleImageLoad() {
    setImageLoading(false);
  }

  /** The <img> could not load — a 404, a 5xx, or a non-image body. */
  function handleImageError() {
    setImageLoading(false);
    setImageSrc(null);
    setError("Could not load the image for this study.");
  }

  /** POST /predict/sample/{id} for a stored study, or POST /predict for an
   *  uploaded file. */
  async function handlePredict() {
    if (!selectedStudy && !selectedFile) return;

    // Entering "busy" clears whatever was on screen before.
    setPhase("busy");
    setResult(null);
    setError(null);
    setSamplesError(null);

    const offline = health === "offline";

    try {
      const prediction = selectedFile
        ? await predictUpload(selectedFile, offline)
        : await predictSample(selectedStudy!.id, offline);

      setResult(prediction);
      setPhase("done");
      setHealth("online");

      // A stored study already has an image URL; an upload only has whatever
      // preview the backend chose to return.
      if (selectedStudy) setImageSrc(imageUrl(selectedStudy.id));
      else if (prediction.previewSrc) setImageSrc(prediction.previewSrc);
    } catch (err) {
      // A failure never renders as a verdict: no result, amber footer text.
      setResult(null);
      setError(messageOf(err, "Prediction failed — unexpected error."));
      setPhase("error");
    }
  }

  /* ── render ────────────────────────────────────────────────────────── */

  return (
    <>
      <Header health={health} />

      <main className="layout">
        <StudyPanel
          source={source}
          samples={samples}
          localFiles={local}
          loading={samplesLoading}
          error={samplesError}
          selected={hasSelection ? selected : null}
          disabled={phase === "busy" || imageLoading}
          onSourceChange={handleSourceChange}
          onSelect={handleSelect}
          onFilesAdded={handleFilesAdded}
        />

        <AnalysisPanel
          selectedName={selectedName}
          hasStudies={count > 0}
          phase={phase}
          result={result}
          imageSrc={imageSrc}
          imageLoading={imageLoading}
          canShowImage={canShowImage}
          // A failed /samples fetch is a real failure, so it uses the same
          // amber alert line as a failed prediction.
          error={error ?? samplesError}
          notice={notice}
          health={health}
          onShowImage={handleShowImage}
          onPredict={() => void handlePredict()}
          onImageLoad={handleImageLoad}
          onImageError={handleImageError}
        />
      </main>
    </>
  );
}

/** Pull a readable message out of an unknown thrown value. */
function messageOf(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

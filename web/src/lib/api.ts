/* ═══════════════════════════════════════════════════════════════════════
 * BACKEND CONTRACT — what the frontend calls, and what it expects back.
 *
 * Every call to the FastAPI backend lives in this file. Components never
 * call fetch directly. If the backend matches what is written below, the
 * frontend needs no changes.
 *
 * Four endpoints, all at the ROOT (no /api prefix). In development Vite
 * proxies /samples, /image and /predict to http://127.0.0.1:8000, so there
 * is no CORS setup needed locally.
 *
 *   GET  /samples               list the studies for the sidebar
 *   GET  /image/{id}            the radiograph, as a real PNG
 *   POST /predict/sample/{id}   predict a study already in the store
 *   POST /predict               predict a file the user uploaded
 *
 * There is NO /health route. The app treats a successful GET /samples as
 * proof the backend is up, and shows "Backend unreachable" when it fails.
 *
 * ───────────────────────────────────────────────────────────────────────
 * 1.  GET /samples
 * ───────────────────────────────────────────────────────────────────────
 * Request:   no parameters.
 * Returns:   200, a JSON ARRAY (a bare array — not {"samples": [...]},
 *            though that shape is tolerated).
 *
 *   [
 *     { "id": "1", "storage_key": "rsna/2024/a3f9c1.dcm" },
 *     { "id": "2", "storage_key": "rsna/2024/b7e2d4.dcm" },
 *     { "id": "3", "storage_key": "rsna/2024/c1a8f0.dcm" }
 *   ]
 *
 *   id           REQUIRED, string. The database id of the DICOM file.
 *                Sent back verbatim in /image/{id} and
 *                /predict/sample/{id}. Never parsed — opaque is fine.
 *                Numbers are accepted and read as strings.
 *
 *   storage_key  OPTIONAL, string. Where the object actually lives.
 *                Carried into SampleItem.storageKey for completeness but
 *                NEVER DISPLAYED — it is backend-internal.
 *                `storageKey` and `key` are also accepted, so your column
 *                name does not have to match.
 *
 * What the user sees:  the sidebar lists each study as `Case_{id}`, so
 *                      id "1" displays as "Case_1". Built by caseLabel()
 *                      in lib/format.ts — change it there and the list,
 *                      the panel heading and the screen-reader labels all
 *                      follow.
 *
 * On failure:  any non-2xx, or an unreachable server, empties the list and
 *              flips the header dot to "Backend unreachable".
 *
 * ───────────────────────────────────────────────────────────────────────
 * 2.  GET /image/{id}          ← the "Show Image" button
 * ───────────────────────────────────────────────────────────────────────
 * Request:   {id} is an `id` from /samples.
 * Returns:   200 with the rendered radiograph as a REAL PNG BODY:
 *
 *              Content-Type: image/png
 *              <binary png bytes>
 *
 *            NOT JSON. NOT base64. NOT a data: URL.
 *
 * This route is never fetch()ed. imageUrl() below just builds the path and
 * an <img src> loads it, so the browser does the work: one request, no
 * base64 bloat, and normal HTTP caching for free.
 *
 * On failure:  return 404 for an unknown id (5xx for a render failure).
 *              The app shows an amber "Could not load the image for this
 *              study." and NO verdict.
 *
 * Note: an image shown on its own gets a NEUTRAL border. Red/blue appears
 * only after a prediction — colour in this app always means the model has
 * answered.
 *
 * ───────────────────────────────────────────────────────────────────────
 * 3.  POST /predict/sample/{id}      ← the "Predict" button, Stored tab
 * ───────────────────────────────────────────────────────────────────────
 * Request:   {id} is an `id` from /samples. No body.
 * Returns:   200 and the prediction JSON (see §5).
 *
 * Do NOT include `preview` here — the frontend already has /image/{id} for
 * stored studies, so sending base64 would just duplicate it.
 *
 * On failure:  404 unknown id, 5xx inference failure.
 *
 * ───────────────────────────────────────────────────────────────────────
 * 4.  POST /predict                  ← the "Predict" button, Upload tab
 * ───────────────────────────────────────────────────────────────────────
 * Request:   multipart/form-data, ONE file in the form field named "file".
 *
 *              POST /predict
 *              Content-Type: multipart/form-data; boundary=...
 *              file=<the .dcm bytes>
 *
 *            In FastAPI:  async def predict(file: UploadFile = File(...))
 *            (needs `python-multipart` installed)
 *
 * Returns:   200 and the prediction JSON (see §5), and here you SHOULD
 *            include `preview`: an uploaded file has no id, so /image/{id}
 *            cannot show it. The preview is the only way the user sees it.

 *
 * On failure:  400 for an empty/unreadable file, 5xx for inference failure.
 *
 * ───────────────────────────────────────────────────────────────────────
 * 5.  The prediction JSON — returned by BOTH predict routes
 * ───────────────────────────────────────────────────────────────────────
 *   {
 *     "label": "Pneumonia",
 *     "pneumonia": true,
 *     "probability": 0.87,
 *     "preview": "<base64 png>"      // POST /predict only
 *   }
 *
 *   probability  REQUIRED, float 0..1. ALWAYS the probability OF PNEUMONIA,
 *                including on a Normal result. Fills the bar and is shown
 *                as "87.0% pneumonia probability". Do not send a
 *                "confidence" number — on a Normal result that would be a
 *                different quantity and the label would be a lie.
 *                Clamped to 0..1; numeric strings and `score` are accepted.
 *
 *   label        Display text, e.g. "Pneumonia" / "Normal". Shown verbatim
 *                as the verdict, so send exactly what you want on screen.
 *
 *   pneumonia    Boolean deciding the COLOUR: true -> red + "POSITIVE
 *                FINDING", false -> blue + "NO FINDING".
 *                If omitted it is inferred from `label`
 *                (/pneumo|opacit|positive/i), then from probability >= 0.5.
 *                Sending it explicitly is safest.
 *
 *   preview      OPTIONAL base64-encoded PNG, for POST /predict only.
 *                Send the BARE base64 — the frontend adds the
 *                "data:image/png;base64," prefix itself. A full data: URL
 *                is also accepted. Omit it and the verdict still renders,
 *                just without an image.
 *
 * ───────────────────────────────────────────────────────────────────────
 * 6.  Errors
 * ───────────────────────────────────────────────────────────────────────
 * Use real HTTP status codes. FastAPI's {"detail": "..."} body is read and
 * appended to the message shown to the user, so make it readable.
 *
 * 502/503/504 are treated as "the backend is down" rather than as an HTTP
 * error, because Vite's proxy turns a refused connection into a 502.
 *
 * A failed request NEVER renders as a verdict: the result card is unmounted
 * and the message appears in amber. A failure must never be mistakable for
 * a "clear study".
 *
 * Every function below either resolves with clean data, or throws an Error
 * whose `message` is the exact user-facing string to display.
 * ═══════════════════════════════════════════════════════════════════════ */

import type { Prediction, SampleItem } from "./types";

/** A score at or above this counts as a positive finding. */
const POSITIVE_THRESHOLD = 0.5;

/** Words in a label that mean "positive finding", when the backend omits the
 *  boolean `pneumonia` field. */
const POSITIVE_LABEL = /pneumo|opacit|positive/i;

/* ── error strings ───────────────────────────────── */

const ERR_NETWORK = "Prediction failed — could not reach the backend.";
const ERR_OFFLINE =
  "Prediction failed — backend unreachable. Start the FastAPI server on :8000.";
const ERR_EMPTY_FILE = "Prediction failed — that file is empty.";
const ERR_UNREADABLE =
  "Prediction failed — the backend returned an unreadable response.";

/** Statuses a proxy returns when it cannot reach the backend at all.
 *  In development Vite turns a refused connection to :8000 into a 502, so a
 *  bare "HTTP 502" would hide the only fact that helps: the server is down. */
const GATEWAY_DOWN = new Set([502, 503, 504]);

/* ── samples ────────────────────────────────────────────────────────── */

/** GET /samples. Throws with the §5.6 "Could not load samples — …" string. */
export async function fetchSamples(signal?: AbortSignal): Promise<SampleItem[]> {
  let res: Response;
  try {
    res = await fetch("/samples", { signal });
  } catch {
    throw new Error("Could not load samples — could not reach the backend.");
  }

  if (!res.ok) {
    if (GATEWAY_DOWN.has(res.status)) {
      throw new Error(
        "Could not load samples — backend unreachable. Start the FastAPI server on :8000.",
      );
    }
    throw new Error(`Could not load samples — HTTP ${res.status}`);
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error("Could not load samples — unreadable response.");
  }

  // Accept either a bare array or { samples: [...] }, like the prototype did.
  const rows = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body.samples)
      ? body.samples
      : [];

  return rows.map((row, i): SampleItem => {
    const item = isRecord(row) ? row : {};

    // `id` is the only field the frontend needs: it is what gets sent back to
    // POST /predict/sample/{id}, and the list label is derived from it.
    const id = asString(item.id) ?? String(i);

    // Carried for completeness; never displayed. Accepts the usual spellings
    // so the backend's column name does not have to match.
    const storageKey =
      asString(item.storage_key) ?? asString(item.storageKey) ?? asString(item.key);

    return storageKey === undefined ? { id } : { id, storageKey };
  });
}

/* ── prediction ─────────────────────────────────────────────────────── */

/** URL of the rendered radiograph for a stored study.
 *
 *  Deliberately not a fetch: GET /image/{id} answers with an image/png body,
 *  so the browser loads it directly from an <img src>. Failures surface as
 *  the image element's onError, not as a thrown promise. */
export function imageUrl(id: string): string {
  return `/image/${encodeURIComponent(id)}`;
}

/**
 * POST /predict — multipart upload of a file the user chose.
 *
 * Used only for the Upload source: those bytes are not in the store, so they
 * have no id and cannot be addressed by /predict/sample/{id}.
 */
export async function predictUpload(
  file: File,
  backendOffline: boolean,
): Promise<Prediction> {
  if (file.size === 0) throw new Error(ERR_EMPTY_FILE);

  const body = new FormData();
  body.append("file", file, file.name);

  let res: Response;
  try {
    res = await fetch("/predict", { method: "POST", body });
  } catch {
    throw new Error(backendOffline ? ERR_OFFLINE : ERR_NETWORK);
  }
  return readPrediction(res);
}

/**
 * POST /predict/sample/{id} — prediction for a study already in the store.
 *
 * `backendOffline` is what the last /samples call saw. It only changes which
 * error string a network failure produces, so the message can name the real
 * cause instead of a generic one.
 */
export async function predictSample(
  id: string,
  backendOffline: boolean,
): Promise<Prediction> {
  const path = `/predict/sample/${encodeURIComponent(id)}`;

  let res: Response;
  try {
    res = await fetch(path, { method: "POST" });
  } catch {
    throw new Error(backendOffline ? ERR_OFFLINE : ERR_NETWORK);
  }
  return readPrediction(res);
}

/** Turn a prediction response into a Prediction, or throw a display-ready
 *  message. Shared by both prediction routes so their errors read alike. */
async function readPrediction(res: Response): Promise<Prediction> {
  if (!res.ok) {
    // The proxy could not reach FastAPI — say so, rather than "HTTP 502".
    if (GATEWAY_DOWN.has(res.status)) throw new Error(ERR_OFFLINE);

    const detail = await readErrorDetail(res);
    throw new Error(
      `Prediction failed — HTTP ${res.status}${detail ? ` — ${detail.slice(0, 140)}` : ""}`,
    );
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(ERR_UNREADABLE);
  }

  if (!isRecord(body)) throw new Error(ERR_UNREADABLE);

  return normalisePrediction(body);
}

/** Pull a human-readable detail out of an error body. FastAPI sends
 *  `{"detail": "Empty file"}`; anything else is used as raw text. */
async function readErrorDetail(res: Response): Promise<string> {
  let text: string;
  try {
    text = await res.text();
  } catch {
    return "";
  }

  try {
    const parsed: unknown = JSON.parse(text);
    if (isRecord(parsed)) {
      const detail = asString(parsed.detail);
      if (detail) return detail;
    }
  } catch {
    // Not JSON — fall through and use the raw text.
  }

  return text.trim();
}

/**
 * Turn whatever the backend sent into a `Prediction`, defensively:
 *
 *   - `pneumonia` may be absent  -> infer from the label, then from probability
 *   - `preview`   may be absent  -> no image; the verdict still renders
 *   - `probability` is clamped to 0..1 and falls back to 0
 */
export function normalisePrediction(raw: Record<string, unknown>): Prediction {
  const rawProbability = asFiniteNumber(raw.probability) ?? asFiniteNumber(raw.score) ?? 0;
  const probability = Math.min(Math.max(rawProbability, 0), 1);

  const label = asString(raw.label);

  let positive: boolean;
  if (typeof raw.pneumonia === "boolean") {
    positive = raw.pneumonia;
  } else if (label) {
    positive = POSITIVE_LABEL.test(label);
  } else {
    positive = probability >= POSITIVE_THRESHOLD;
  }

  const prediction: Prediction = {
    label: label ?? (positive ? "Pneumonia" : "Normal"),
    positive,
    probability,
  };

  const preview = asString(raw.preview);
  if (preview) {
    prediction.previewSrc = preview.startsWith("data:")
      ? preview
      : `data:image/png;base64,${preview}`;
  }

  return prediction;
}

/* ── tiny unknown-narrowing helpers ─────────────────────────────────── */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** A non-empty string, or undefined. */
function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** A finite number (accepting numeric strings), or undefined. */
function asFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

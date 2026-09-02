/* Shared types for the whole app.
 *
 * Keep these boring and explicit — every component takes them as props. */

/** Reachability of the backend, derived from the GET /samples call.
 *  There is no /health endpoint; the sample fetch is the only signal. */
export type Health = "checking" | "online" | "offline";

/** Which list the user is picking from: the server's store, or files they
 *  dropped in themselves. The two have different capabilities — a stored
 *  study has an id (so it can be shown and predicted), an uploaded file has
 *  only bytes (so it can only be predicted). */
export type Source = "stored" | "upload";

/** Where the analysis panel is in its lifecycle. */
export type Phase = "idle" | "busy" | "done" | "error";

/** One row from GET /samples.
 *
 *  The store has exactly two columns: an id and a storage key. There is no
 *  filename and no size, so the list displays `Case_{id}` (see caseLabel in
 *  format.ts). `storageKey` is carried through but never shown — it belongs
 *  to the backend. */
export interface SampleItem {
  /** Sent back verbatim as POST /predict/sample/{id}. */
  id: string;
  /** Backend-internal object location. Display code must not use this. */
  storageKey?: string;
}

/** Normalised in api.ts from the raw FastAPI body. */
export interface Prediction {
  /** "Pneumonia" | "Normal" | whatever the model returns. */
  label: string;
  /** Resolved: pneumonia ?? /pneumo|opacit|positive/i.test(label) ?? prob >= 0.5 */
  positive: boolean;
  /** Clamped 0..1. Always the *pneumonia* probability. */
  probability: number;
  /** Already prefixed to a `data:image/png;base64,…` URL. Absent if the
   *  backend returned no preview — the verdict renders without an image. */
  previewSrc?: string;
}

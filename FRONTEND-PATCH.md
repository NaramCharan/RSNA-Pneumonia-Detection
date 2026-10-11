# Stored-study image fix — 12 October 2026

The live `/samples` API returns integer database IDs beginning at 1. The old frontend discarded numeric IDs and substituted zero-based row positions. The first study consequently requested `/image/0` instead of `/image/1`; every later row also pointed at the wrong study.

The frontend now converts safe integer IDs to strings, preserves opaque string IDs, and rejects missing or invalid IDs instead of inventing indices. Image and prediction routes use the same preserved ID. Regression tests cover both routes, zero/nonsequential IDs, wrapped responses and malformed IDs.

The frontend patch reuses the exact deployed v5 Linux/amd64 runtime and model layers and replaces only `/app/web/dist`. The base digest is pinned in `Dockerfile.frontend-patch`; inference code, weights and deployment scale settings are retained. The repository's older backend snapshot differs from the deployed backend, so this patch deliberately builds on the deployed image.

To reproduce with Docker available:

```sh
npm --prefix web ci
npm --prefix web run test
npm --prefix web run lint
npm --prefix web run build
docker build --platform linux/amd64 -f Dockerfile.frontend-patch -t rsnaproject.azurecr.io/rsna_docker_image_azure:v5-study-ids-20261012 .
docker push rsnaproject.azurecr.io/rsna_docker_image_azure:v5-study-ids-20261012
az containerapp update -n rsna-app -g rsna-pneumonia-rg --image rsnaproject.azurecr.io/rsna_docker_image_azure:v5-study-ids-20261012
```

On this host the static layer was assembled with the OCI registry protocol because no local Docker engine was available. Its config and manifest hashes were verified, and the inherited entrypoint/runtime configuration was preserved. Rebuilding with Docker produces an equivalent frontend patch, not necessarily the same manifest digest.

Validation: Node regression tests, source-only lint, TypeScript/Vite build, full frontend npm audit, and Chromium against the real API. The browser selected `Case_1`, requested `/image/1`, and decoded the returned radiograph. No user upload was used. An upstream `source-map-js` development dependency was updated to remove its audit alert. Lint now targets source/config/tests explicitly because this repository tracks a subset of `node_modules`.

The existing scale-to-zero setting can cause a cold start. This patch fixes study identity and image selection; it does not certify the model clinically.

Deployed image: `rsnaproject.azurecr.io/rsna_docker_image_azure:v5-study-ids-20261012`, manifest `sha256:82ece5d823544cc4f02d6a5905485320372475bf161cd2ebd4749c09088c7e1a`, revision `rsna-app--0000008`. Live Chromium verification selected both `Case_1` and `Case_42`, confirmed successful decoding through `/image/1` and `/image/42`, and found no page errors. Roll back using the prior `v5` image if needed.

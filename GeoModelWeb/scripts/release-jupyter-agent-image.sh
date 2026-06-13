#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXT_DIR="${ROOT_DIR}/jupyterlab-geomodel"
SERVER_DIR="${ROOT_DIR}/GeoModelWeb/server"
DOCKER_DIR="${ROOT_DIR}/GeoModelWeb/server/docker"
WHEEL_NAME="jupyterlab_geomodel-0.1.0-py3-none-any.whl"
DEFAULT_RUNTIME_IMAGE="opengms/geomodel-core:2026.05"

echo "[1/4] Build JupyterLab extension assets..."
npm --prefix "${EXT_DIR}" run build

echo "[2/4] Build Python wheel..."
python3 -m pip wheel "${EXT_DIR}" -w "${EXT_DIR}/dist" --no-deps

echo "[3/4] Replace Docker wheel artifact..."
cp -f "${EXT_DIR}/dist/${WHEEL_NAME}" "${DOCKER_DIR}/${WHEEL_NAME}"
ls -lh "${DOCKER_DIR}/${WHEEL_NAME}"

echo "[4/4] Update installed OpenGeoLab runtime images with the rebuilt extension wheel..."
RUNTIME_IMAGES="$(node - "${SERVER_DIR}" <<'NODE'
const path = require('path');
const serverDir = process.argv[2];
const { getRuntimeCatalog } = require(path.join(serverDir, 'utils/jupyterRuntime'));
for (const runtime of getRuntimeCatalog()) {
  if (runtime.imageName) {
    console.log(runtime.imageName);
  }
}
NODE
)"

UPDATED=0
while IFS= read -r runtime_image; do
  if [ -z "${runtime_image}" ]; then
    continue
  fi

  if ! docker image inspect "${runtime_image}" >/dev/null 2>&1; then
    echo "Skip ${runtime_image}: image is not installed locally."
    continue
  fi

  echo "Update ${runtime_image}..."
  docker build \
    --build-arg BASE_IMAGE="${runtime_image}" \
    -f "${DOCKER_DIR}/Dockerfile.update" \
    -t "${runtime_image}" \
    "${DOCKER_DIR}"
  UPDATED=$((UPDATED + 1))
done <<EOF
${RUNTIME_IMAGES}
EOF

if [ "${UPDATED}" -eq 0 ]; then
  echo "No catalog runtime images are installed locally; ${DEFAULT_RUNTIME_IMAGE} must be built before launching Jupyter."
fi

echo "Done. Please restart existing Jupyter containers to use the new image."

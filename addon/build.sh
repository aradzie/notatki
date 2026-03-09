#!/usr/bin/env bash

rm -rf notatki.ankiaddon vendor.zip requirements.txt vendor

uv export --no-dev --format requirements-txt > requirements.txt

uv pip install --target vendor -r requirements.txt

find vendor -name "*.dist-info" -type d -exec rm -rf {} +
find vendor -name "tests" -type d -exec rm -rf {} +
find vendor -name "__pycache__" -type d -exec rm -rf {} +

(cd vendor && zip -r ../vendor.zip .)

rm -rf requirements.txt vendor

# package addon

zip -r notatki.ankiaddon \
  notatki \
  __init__.py \
  LICENSE.txt \
  manifest.json \
  README.md \
  vendor.zip \
  -x "*test*" "*__pycache__*"

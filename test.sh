#!/usr/bin/env bash

set -euo pipefail

PATH="$PATH:$(pwd)/bin"
npm run build

DIR=test-$(date +%s)

echo "Creating project /tmp/$DIR"

cd /tmp
mkdir "$DIR"
cd "$DIR"

create

open "/tmp/$DIR"
code "/tmp/$DIR"

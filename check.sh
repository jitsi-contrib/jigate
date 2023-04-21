#!/bin/bash
DIR=$(dirname "$(pwd)/$0")

set -euxo pipefail
cd $DIR
./rebuild.sh
npm run lint

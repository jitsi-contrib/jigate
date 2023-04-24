#!/bin/bash
DIR=$(dirname "$(pwd)/$0")

set -euxo pipefail
cd $DIR
./build-node.sh
npm run lint

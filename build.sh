#!/bin/bash
DIR=$(dirname "$(pwd)/$0")

set -euxo pipefail
cd $DIR
./build-node.sh
echo "#### Rebuild the docker images"
docker build -t jigate/jigate .
docker build -t jigate/freeswitch freeswitch

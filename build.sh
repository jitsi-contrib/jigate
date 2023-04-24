#!/bin/bash
DIR=$(dirname "$(pwd)/$0")

set -euxo pipefail
cd $DIR
./build-node.sh
echo "#### Rebuild docker image"
docker build -t jigate/jigatecon .
for service in jigate sipgw; do
    docker build -t jigate/$service $service
done

#!/bin/bash
DIR=$(dirname "$(pwd)/$0")

set -euxo pipefail
cd $DIR
npm ci
echo "#### Build the modesl module"
cd node_modules/modesl
curl -o tsconfig.json  https://raw.githubusercontent.com/englercj/node-esl/fdea52fb661aae68a22165e39f2824bac55d926a/tsconfig.json
curl -o package-lock.json  https://raw.githubusercontent.com/englercj/node-esl/fdea52fb661aae68a22165e39f2824bac55d926a/package-lock.json
npm ci
npm run build
cd ../..
echo "#### Build jigsi project"
npm run build
echo "#### Rebuild docker image"
docker build -t jigate/jigatecon .
for service in jigate sipgw; do
    docker build -t jigate/$service $service
done

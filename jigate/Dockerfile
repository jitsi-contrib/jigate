# See https://github.com/signalwire/freeswitch/blob/master/docker/release/Dockerfile
FROM alpine:3.16
COPY . /
RUN apk update && apk add --no-cache --clean-protected freeswitch
HEALTHCHECK --interval=15s --timeout=5s \
    CMD fs_cli --host=$(hostname) --password=$JIGATE_ESL_PASSWORD -x status | grep -q ^UP || exit 1
ENTRYPOINT ["freeswitch","-c","-nonat"]

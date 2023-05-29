# Jigate services

Jigate is a SIP gateway for [Jigasi] based on FreeSWITCH.

[![jigate services](jigate.drawio.svg)](jigate.drawio.svg)

## Jigate

The jigate service controls the behavior of the [FreeSWITCH](#freeswitch) instance.
SIP participants can toggle their mute and raised hand status.

## Freeswitch

The [freeswitch](freeswitch) directory contains the configuration and Docker file of a FreeSWITCH service
which serves as a SIP gateway for [Jigasi].
It can register to a SIP gateway service or allow a user or gateway to register.
It receives calls for [Jitsi Meet] and is controlled by the [Jigate](#jigate) esl service.

## Setup

To setup jigate using [docker-jitsi-meet]:

1. Build the Docker images:

    ```shell
    ./build.sh
    ```

1. Copy the [jigate.yml](jigate.yml) file to your `docker-jitsi-meet` deployment directory.
1. Add the environment vars from [jigate.env](jigate.env) to your `.env` file.
1. In `docker-jitsi-meet` run:

    ```shell
    docker-compose -f docker-compose.yml -f jigasi.yml -f jigate.yml up -d
    ```

## Test

1. Register a SIP client as `"<Display name>" <sip:user@meet.jitsi>` to the [jigate](#jigate) service at `<sip:127.0.0.1;transport=udp>`.
1. Call `sip:1000@127.0.0.1` to dial into an ivr and provide the meeting id
   or directly connect to a meeting by calling `sip:<meeting id>@127.0.0.1`.

## BOSH Multi-domain Support

1. Configure [Jigasi] to [use BOSH].
1. Call `sip:<meeting id>.<domain>@127.0.0.1` to connect to the meeting at the specified domain.

## Monitor

The services can be monitored by REST API at `http://<jigate>:8080/stats`. It returns a JSON object with the following data:

- **activeCalls** (integer): the count of active calls
- **internalProfileRunning** (boolean): whether the Freeswitch internal profile is running
- **externalProfileRunning** (boolean): whether the Freeswitch external profile is running
- **registrations** (integer): the count of registrations

[docker-jitsi-meet]: https://github.com/jitsi/docker-jitsi-meet
[Jigasi]: https://github.com/jitsi/jigasi
[Jitsi Meet]: https://github.com/jitsi/jitsi-meet
[use BOSH]: https://community.jitsi.org/t/how-bosh-works-with-jigasi/16284/2

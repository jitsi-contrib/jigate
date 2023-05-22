# Jigate services

Jigate is a SIP gateway for Jigasi based on FreeSWITCH.

[![jigate services](jigate.drawio.svg)](jigate.drawio.svg)

## Jigate

The [jigate](jigate) directory contains the configuration and Docker file of a FreeSWITCH service
which serves as a SIP gateway for [jigasi].
It can register to a SIP gateway service or allow a user or gateway to register.
It receives calls for [jitsi meet] and is controlled by the [jigatecon](#jigatecon) esl service.

## Jigatecon

The jigatecon service controls the behavior of the [jigate](#jigate) FreeSWITCH instance.
SIP participants can toggle their mute and raised hand status.

The service uses [node-esl] and is written in **TypeScript**.
It is based on the following tutorials:

- [How To Set Up a Node Project With Typescript]:
  The full set up, except installing modesl and @types/modesl instead of express.
- [How to Set Up a Node.js Project with TypeScript]:
  Use of @tsconfig/node16, @types/node, ts-node, .eslintignore and .vscode.
- [Developing applications for FreeSWITCH]

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

## Monitor

The services can be monitored by REST API at `http://<jigatecon>:8080/stats`. It returns a JSON object with the following data:

- **activeCalls** (integer): the count of active calls
- **internalProfileRunning** (boolean): whether the Freeswitch internal profile is running
- **externalProfileRunning** (boolean): whether the Freeswitch external profile is running
- **registrations** (integer): the count of registrations

[Developing applications for FreeSWITCH]: https://medium.com/makingtuenti/developing-applications-for-freeswitch-fccbe75ada81
[docker-jitsi-meet]: https://github.com/jitsi/docker-jitsi-meet
[How To Set Up a Node Project With Typescript]: https://www.digitalocean.com/community/tutorials/setting-up-a-node-project-with-typescript
[How to Set Up a Node.js Project with TypeScript]: https://blog.appsignal.com/2022/01/19/how-to-set-up-a-nodejs-project-with-typescript.html
[jigasi]: https://github.com/jitsi/jigasi
[jitsi meet]: https://github.com/jitsi/jitsi-meet
[node-esl]: https://github.com/englercj/node-esl

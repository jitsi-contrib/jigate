# Jigate services

[![jigate services](jigate.drawio.svg)](jigate.drawio.svg)

## Jigate

The [jigate](jigate) directory contains the configuration and Docker file of a FreeSWITCH service
which serves as a SIP gateway for [jigasi].
It registers to a [SIP gateway (sipgw)](#sipgw) service and receives calls for [jitsi meet].
It is controlled by the [jigatecon](#jigatecon) esl service.

## Jigatecon

The jigatecon service controls the behavior of the [jigate](#jigate) FreeSWITCH instance.
SIP participants can control their mute and raised hand status.

The service uses [node-esl] and is written in **TypeScript**.
It is based on the following tutorials:

- [How To Set Up a Node Project With Typescript]:
  The full set up, except installing modesl and @types/modesl instead of express.
- [How to Set Up a Node.js Project with TypeScript]:
  Use of @tsconfig/node16, @types/node, ts-node, .eslintignore and .vscode.
- [Developing applications for FreeSWITCH]

## Sipgw

The [sipgw](sipgw) directory contains the configuration and Docker file of a development SIP gateway service.
It allows clients to register and call into [jitsi meet] conferences.

In a production environment, this service would be replaced by your [PBX].

## Setup

To setup jigate using [docker-jitsi-meet], copy the [jigate.yml](jigate.yml) and  [sipgw.yml](sipgw.yml) files to your `docker-jitsi-meet` deployment directory, add any environment vars from [jigate.env](jigate.env) to your `.env` file and run:

```shell
docker-compose -f docker-compose.yml -f jigasi.yml -f sipgw.yml -f jigate.yml up -d
````

> In a production environment you would register the [jigate](#jigate) service to your PBX
> and would not deploy the [sipgw](#sipgw) service. In this case you will not use
> the [sipgw.yml](sipgw.yml) file.

## Test

1. Register a SIP client to the [sipgw](#sipgw) service at `<sip:127.0.0.1;transport=udp>` as `"<Display name>" <sip:user@meet.jitsi>`
1. Call `sip:<meeting id>@127.0.0.1`.

[Developing applications for FreeSWITCH]: https://medium.com/makingtuenti/developing-applications-for-freeswitch-fccbe75ada81
[docker-jitsi-meet]: https://github.com/jitsi/docker-jitsi-meet
[How To Set Up a Node Project With Typescript]: https://www.digitalocean.com/community/tutorials/setting-up-a-node-project-with-typescript
[How to Set Up a Node.js Project with TypeScript]: https://blog.appsignal.com/2022/01/19/how-to-set-up-a-nodejs-project-with-typescript.html
[jigasi]: https://github.com/jitsi/jigasi
[jitsi meet]: https://github.com/jitsi/jitsi-meet
[node-esl]: https://github.com/englercj/node-esl
[PBX]: https://en.wikipedia.org/wiki/Business_telephone_system#Private_branch_exchange

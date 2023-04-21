FROM node:16-alpine
COPY . /home/node/jigatecon
ENTRYPOINT ["node","/home/node/jigatecon/dist/server.js"]
USER node

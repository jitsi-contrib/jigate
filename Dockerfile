FROM node:16-alpine
COPY . /home/node/jigate
ENTRYPOINT ["node","/home/node/jigate/dist/server.js"]
USER node

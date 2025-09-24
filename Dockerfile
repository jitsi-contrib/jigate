FROM node:20-alpine
COPY . /home/node/jigate
ENTRYPOINT ["node","/home/node/jigate/dist/server.js"]
USER node

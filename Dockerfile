FROM node:16

WORKDIR /privy-daemon

# install dependencies
COPY package.json /privy-daemon/package.json
RUN npm install

# build application
COPY ./src /privy-daemon/src
COPY ./tsconfig.json /privy-daemon/tsconfig.json
RUN npm run build

# expose default port 6131
EXPOSE 6131
ENTRYPOINT ["node", "dist/main.js"]
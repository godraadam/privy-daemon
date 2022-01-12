FROM node:17
WORKDIR /privy-daemon
COPY . .
EXPOSE  8668
CMD ["npm", "run", "start:prod"]
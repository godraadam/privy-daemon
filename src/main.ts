import express from "express";
import { apiRouter } from "./api/cmd/indexAPI";
import {
  getIPFSNodeId,
  initIpfs,
} from "./service/ipfsService";
import {
  checkRepos,
  initOrbitDb,
} from "./repo/connectionManager";
import {
  generateIdentity,
  generateProxyIdentity,
  getPublicKeyString,
  getUserAddress,
} from "./service/identityService";
import { betterLogging, expressMiddleware as logger } from "better-logging";
import chalk from "chalk";
import { cloneRepos, initRepos, subscribeToTopics } from "./service/startupService";

betterLogging(console, {
  logLevels: {
    debug: 0,
  },
});
console.logLevel = 2;

const main = async () => {
  // get boot information
  const type = process.env.NODE_TYPE;
  const port = process.env.PORT ?? "6131";
  const seed = process.env.SEED;
  const pubkey = process.env.PUBKEY;
  const repo = process.env.REPO;
  const username = process.env.USERNAME;
  const token = process.env.TOKEN;

  // validate arguments

  if (!type || ["origin", "remote", "proxy"].indexOf(type) < 0) {
    console.error("Invalid node type!");
    process.exit(1);
  }

  if (type === "origin" || type === "remote") {
    if (!seed) {
      console.error(`Seed is required for ${type} type!`);
      process.exit(1);
    }
    if (!username) {
      console.error(`Username is required for ${type} type!`);
      process.exit(1);
    }
  }

  if (type === "proxy" && (!pubkey || !token)) {
    console.error(`Public key is required for ${type} type!`);
    process.exit(1);
  }

  if (!repo) {
    console.error(`Repo is undefined!`);
    process.exit(1);
  }

  // startup internal ipfs node
  console.info("Starting IPFS node...");
  await initIpfs(repo, parseInt(port));
  console.info(
    `IPFS succesfully started with node id ${await getIPFSNodeId()}`
  );

  // initialize orbitdb instance
  console.info("Starting OrbitDB instance...");
  await initOrbitDb();
  console.info("OrbitDb instance successfully started!");

  switch (type) {
    case "origin":
      if (!seed) {
        console.error(`Seed is required for ${type} type!`);
        process.exit(1);
      }
      if (!username) {
        console.error(`Username is required for ${type} type!`);
        process.exit(1);
      }
      
      // ________________Generate Identity___________________
      await generateIdentity(seed, username, type);

      // _______________Init Repositories___________________
      await initRepos();

      // ______________Sub to user adress endpotins__________
      await subscribeToTopics(getUserAddress());
      break;
    case "remote":
      // genereate keypair and address from credentials
      if (!seed) {
        console.error("Seed is required!");
        process.exit(1);
      }
      if (!username) {
        console.error(`Username is required for ${type} type!`);
        process.exit(1);
      }

      // ________________Generate Identity___________________
      await generateIdentity(seed, username, type);
     
      console.info(await checkRepos() ? "Repositories found locally" : "Repositories not found locally, cloning..")
      // _______________Clone Repositories___________________
      if (!(await checkRepos())) {
        await cloneRepos();
      }
      else {
        await initRepos();
      }
      // ______________Sub to user adress endpotins_______________
      await subscribeToTopics(getUserAddress());
      break;
    case "proxy":
      if (!pubkey) {
        console.error(`Public key is required for ${type} type!`);
        process.exit(1);
      }
      if (!token) {
        console.error(`Token is required for ${type} type!`);
        process.exit(1);
      }
      // generate data necessary for proxying
      generateProxyIdentity(pubkey, token);

      // _______________Clone Repositories___________________
      if (!(await checkRepos())) {
        await cloneRepos();
      }
      else {
        await initRepos();
      }
      // ______________Sub to user adress endpotins__________
      await subscribeToTopics(getUserAddress());
      break;
    default:
    // unreachable code
  }

  // startup local http server
  const app = express();

  app.use(express.json());
  app.use("/api", apiRouter);
  app.use(logger(console));

  app.get("/", (_: any, res: any) => {
    res.send("Privy Daemon is up and running!");
  });

  app.listen(port, () => {
    console.info(
      chalk.green(`Privy Daemon started and listening on port ${port}`)
    );
  });
};

main();

import express from "express";
import { apiRouter } from "./api/cmd/indexAPI";
import {
  getIPFSNodeId,
  initIpfs,
  subscribeToTopic,
} from "./service/ipfsService";
import {
  initContactRepo,
  initMessageRepo,
  initOrbitDb,
} from "./repo/connectionManager";
import {
  generateIdentity,
  generateProxyIdentity,
  getPublicKeyString,
  getUserAddress,
} from "./service/identityService";
import {
  fetchContactRepoAddrAndClone,
  fetchIncomingMessageRepoAddrAndClone,
  fetchOutgoingMessageRepoAddrAndClone,
} from "./service/addressService";
import { PrivyError } from "./model/errors";
import { handleMessage } from "./api/privy/messageApi";
import { handleCloneRequest, handleProxyRequest } from "./api/privy/requestAPI";
import { betterLogging, expressMiddleware as logger } from "better-logging";
import chalk from "chalk";

betterLogging(console, {
  logLevels: {
    debug: 0,
  },
});
console.logLevel = 2;

const main = async () => {
  // get boot information
  const type = process.env.NODE_TYPE;
  const port = process.env.PORT ?? '6131';
  const seed = process.env.SEED;
  const pubkey = process.env.PUBKEY;
  const repo = process.env.REPO;
  const username = process.env.USERNAME;

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

  if (type === "proxy" && !pubkey) {
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
      // genereate keypair and address from seed
      if (!seed) {
        console.error(`Seed is required for ${type} type!`);
        process.exit(1);
      }
      if (!username) {
        console.error(`Username is required for ${type} type!`);
        process.exit(1);
      }
      await generateIdentity(seed, username);
      console.info(`Derived public key: ${getPublicKeyString()}`);
      console.info(`Derived user address: ${getUserAddress()}`);

      // initialize messages repo
      const msgRepo = initMessageRepo();

      // initialize contacts repo
      const contRepo = initContactRepo();

      //await creation of repos
      await Promise.all([msgRepo, contRepo]);

      // subscribe to user endpoints
      _subscribeToTopics(getUserAddress());
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
      await generateIdentity(seed, username);
      console.info(`Derived public key: ${getPublicKeyString()}`);
      console.info(`Derived user address: ${getUserAddress()}`);
      
      
      // clone repos
      console.info("Cloning repositories...")
      console.info("Fetching incoming messages...")
      await fetchIncomingMessageRepoAddrAndClone(async (err?: PrivyError) => {
        if (err) {
          console.error(
            `Failed to clone incoming message repo! Error is ${err.toString()}. Exiting...`
          );
          process.exit(1);
        }
        console.info("Fetching outgoing messages...")

        await fetchOutgoingMessageRepoAddrAndClone(async (err?: PrivyError) => {
          if (err) {
            console.error(
              `Failed to clone outgoing message repo! Error is ${err.toString()}. Exiting...`
            );
            process.exit(1);
          }
          console.info("Fetching contacts...")

          await fetchContactRepoAddrAndClone(async (err?: PrivyError) => {
            if (err) {
              console.error(
                `Failed to clone contacts repo! Error is ${err.toString()}. Exiting...`
              );
              process.exit(1);
            }
            await _subscribeToTopics(getUserAddress());
          });
        });
      });
      break;
    case "proxy":
      if (!pubkey) {
        console.error(`Public key is required for ${type} type!`);
        process.exit(1);
      }
      // generate data necessary for proxying
      generateProxyIdentity(pubkey);

      // clone repos
       fetchIncomingMessageRepoAddrAndClone(async (err?: PrivyError) => {
        if (err) {
          console.error(
            `Failed to clone incoming message repo! Error is ${err.toString()}. Exiting...`
          );
          process.exit(1);
        }
        fetchOutgoingMessageRepoAddrAndClone(async (err?: PrivyError) => {
          if (err) {
            console.error(
              `Failed to clone outgoing message repo! Error is ${err.toString()}. Exiting...`
            );
            process.exit(1);
          }
          fetchContactRepoAddrAndClone(async (err?: PrivyError) => {
            if (err) {
              console.error(
                `Failed to clone contacts repo! Error is ${err.toString()}. Exiting...`
              );
              process.exit(1);
            }
            console.info("Repositories succesfully cloned!")
            _subscribeToTopics(getUserAddress());
          });
        });
      });
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

const _subscribeToTopics = async (addr: string) => {
  await subscribeToTopic(`${addr}/inbox`, handleMessage);
  console.info(`Listening for messages on ${addr}/inbox`);

  await subscribeToTopic(`${addr}/request/clone`, handleCloneRequest);
  console.info(`Listening for clone requests on ${addr}/request/clone`);

  await subscribeToTopic(`${addr}/request/proxy`, handleProxyRequest);
  console.info(`Listening for proxy requests on ${addr}/request/proxy`);
};

main();

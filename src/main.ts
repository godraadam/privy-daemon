import express from "express";
import { apiRouter } from "./api/cmd/indexAPI";
import { getIPFSNodeId, initIpfs, subscribeToTopic } from "./service/ipfsService";
import {
  initContactRepo,
  initMessageRepo,
  initOrbitDb,
} from "./repo/connectionManager";
import {
  generateIdentity,
  getPublicKeyString,
  getUserAddress,
} from "./service/identityService";
import { addContact } from "./service/contactService";
import { sha256 } from "./util/crypto";
import { PrivyContact } from "./model/contactModel";
import {
  fetchContactRepoAddrAndClone,
  fetchMessageRepoAddrAndClone,
} from "./service/addressService";
import { PrivyError } from "./model/errors";
import { handleMessage } from "./api/privy/messageApi";
import { handleCloneRequest, handleProxyRequest } from "./api/privy/requestAPI";
import { parseCommandLine } from "./util/cmdParser";
import {betterLogging, expressMiddleware as logger} from 'better-logging'
import chalk from 'chalk'

betterLogging(console);
console.logLevel = 2;

const main = async () => {
  // parse command line args
  const args = await parseCommandLine();
  
  // validate arguments
  if ((args.type === "origin" || args.type === "remote") && (!args.username || !args.password)) {
    console.error(`Username and password are required for ${args.type} type!`);
    process.exit(1);
  }
  
  if (args.type === "proxy" && !args.pubkey) {
    console.error(`Public key is required for ${args.type} type!`);
    process.exit(1);
  }
  
  // startup internal ipfs node
  console.info("Starting IPFS node...");
  await initIpfs();
  console.info(`IPFS succesfully started with node id ${await getIPFSNodeId()}`);

  // initialize orbitdb instance
  console.info("Starting OrbitDB instance...");
  await initOrbitDb();
  console.info("OrbitDb instance successfully started!");

  switch (args.type) {
    case "origin":
      // genereate keypair and address from credentials
      if (!args.password || !args.username) { // TODO: surely there has to be a way to avoid this double checking
        console.error("username and password are required!");
        process.exit(1);
      }
      generateIdentity(args.password, args.username);
      console.info(`Derived public key: ${getPublicKeyString()}`)
      console.info(`Derived user address: ${getUserAddress()}`)

      // initialize messages repo
      await initMessageRepo();

      // create self contact object
      const self: PrivyContact = {
        alias: args.username,
        pubkey: getPublicKeyString(),
        address: getUserAddress(),
        trusted: true,
        hash: sha256(args.username),
      };

      // initialize contacts repo
      await initContactRepo();
      await addContact(self);

      // subscribe to user endpoints
      _subscribeToTopics(getUserAddress());
      break;
    case "remote":
      // genereate keypair and address from credentials
      if (!args.password || !args.username) {
        console.error("username and password are required!");
        process.exit(1);
      }
      generateIdentity(args.password, args.username);

      // clone repos
      await fetchMessageRepoAddrAndClone(async (err?: PrivyError) => {
        if (err) {
          console.error(
            `Failed to clone message repo! Error is ${err.toString()}. Exiting...`
          );
          process.exit(1);
        }
        await fetchContactRepoAddrAndClone((err?: PrivyError) => {
          if (err) {
            console.error(
              `Failed to clone contacts repo! Error is ${err.toString()}. Exiting...`
            );
            process.exit(1);
          }
          _subscribeToTopics(getUserAddress());
        });
      });
      break;
    case "proxy":
      console.error("Not yet implemented!");
      process.exit(1);
    default:
      console.error("Invalid node type!");
      process.exit(1);
  }

  // startup local http server
  const app = express();

  app.use(express.json());
  app.use("/api", apiRouter);
  app.use(logger(console))

  app.get("/", (_: any, res: any) => {
    res.send("Privy Daemon is up and running!");
  });

  app.listen(args.port, () => {
    console.info(chalk.green(`Privy Daemon started and listening on port ${args.port}`));
  });
};

const _subscribeToTopics = (addr: string) => {
  subscribeToTopic(`${addr}/inbox`, handleMessage);
  console.info(`Listening for messages on ${addr}/inbox`);

  subscribeToTopic(`${addr}/request/clone`, handleCloneRequest);
  console.info(`Listening for clone requests on ${addr}/request/clone`);

  subscribeToTopic(`${addr}/request/proxy`, handleProxyRequest);
  console.info(`Listening for proxy requests on ${addr}/request/proxy`);
};

main();

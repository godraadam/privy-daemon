import { handleMessage } from "../api/privy/messageApi";
import {
  handleCloneRequest,
  handleProxyRequest,
} from "../api/privy/requestAPI";
import { PrivyError } from "../model/errors";
import { initContactRepo, initMessageRepo } from "../repo/connectionManager";
import {
  fetchContactRepoAddrAndClone,
  fetchIncomingMessageRepoAddrAndClone,
  fetchOutgoingMessageRepoAddrAndClone,
} from "./addressService";
import { subscribeToTopic } from "./ipfsService";

export const initRepos = async () => {
  console.info("Initializing local repositories...");
  // initialize messages repo
  const msgRepo = initMessageRepo();

  // initialize contacts repo
  const contRepo = initContactRepo();

  //await creation of repos
  await Promise.all([msgRepo, contRepo]);
};

export const cloneRepos = async () => {
  console.info("Cloning repositories...");
  console.info("Fetching incoming messages...");
  await fetchIncomingMessageRepoAddrAndClone(async (err?: PrivyError) => {
    if (err) {
      console.error(
        `Failed to clone incoming message repo! Error is ${err.toString()}. Exiting...`
      );
      process.exit(1);
    }
  });
  console.info("Fetching outgoing messages...");

  await fetchOutgoingMessageRepoAddrAndClone(async (err?: PrivyError) => {
    if (err) {
      console.error(
        `Failed to clone outgoing message repo! Error is ${err.toString()}. Exiting...`
      );
      process.exit(1);
    }
  });

  console.info("Fetching contacts...");
  await fetchContactRepoAddrAndClone(async (err?: PrivyError) => {
    if (err) {
      console.error(
        `Failed to clone contacts repo! Error is ${err.toString()}. Exiting...`
      );
      process.exit(1);
    }
  });
};

export const subscribeToTopics = async (addr: string) => {
  await subscribeToTopic(`${addr}/inbox`, handleMessage);
  console.info(`Listening for messages on ${addr}/inbox`);

  await subscribeToTopic(`${addr}/request/clone`, handleCloneRequest);
  console.info(`Listening for clone requests on ${addr}/request/clone`);

  await subscribeToTopic(`${addr}/request/proxy`, handleProxyRequest);
  console.info(`Listening for proxy requests on ${addr}/request/proxy`);
};

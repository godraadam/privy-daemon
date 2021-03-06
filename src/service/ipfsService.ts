import { IPFS, create } from "ipfs-core";
import { MessageHandlerFn } from "ipfs-core-types/src/pubsub";

let _ipfs: IPFS | null = null;

export const initIpfs = async (repo: string, port: number) => {
  if (!_ipfs) {
    _ipfs = await create({
      repo: repo,
      relay: {
        enabled: true,
        hop: {
          enabled: false,
        },
      },
      config: {
        Addresses: {
          API: `ip4/127.0.0.1/tcp/${port}`,
          Gateway: `ip4/127.0.0.1/tcp/${port + 1000}`,
          Swarm: [
            `/ip4/0.0.0.0/tcp/${port + 2000}`,
            `/ip4/127.0.0.1/tcp/${port + 3000}/ws`
          ],
        }
      }
    });
  }
};

export const getIpfsInstance = () => _ipfs;

export const subscribeToTopic = async (topic: string, fn: MessageHandlerFn) => {
  await _ipfs?.pubsub.subscribe(topic, fn);
};

export const unSubscribeFromTopic = async (topic: string) => {
  await _ipfs?.pubsub.unsubscribe(topic);
};

export const publishToTopic = async (topic: string, msg: string) => {
  await _ipfs?.pubsub.publish(topic, new TextEncoder().encode(msg));
};

export const getIPFSNodeId = async () => {
  const id = await _ipfs?.id();
  return id?.id;
};

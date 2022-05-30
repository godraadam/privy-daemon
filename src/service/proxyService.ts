import { PrivyContact } from "../model/contactModel";
import { ProxyRequest, ProxyRequestResponse } from "../model/requestModel";
import {
  decryptMessage,
  generateNonce,
  signMessage,
  verifySignature,
} from "../util/crypto";
import { getPublicKeyString, getUserName } from "./identityService";
import { publishToTopic, subscribeToTopic } from "./ipfsService";
import { Message } from "ipfs-core-types/src/pubsub";
import { PrivyError } from "../model/errors";
import axios from "axios";

export const sendProxyrequest = async (
  proxy_candidate: PrivyContact,
  callback: (err?: PrivyError) => void
) => {
  const _handleResponse = async (msg: Message) => {
    const response = JSON.parse(msg.data.toString()) as ProxyRequestResponse;
    console.info(`Received response to proxy request: ${response}`);
    if (response.status === "accepted") {
      const verified = verifySignature(
        response.nonce,
        response.signature,
        response.pubkey
      );

      if (!verified) {
        callback(PrivyError.INVALID_SIGNATURE);
      }
      if (verified) {
        // start proxying
        await startProxyNode(response.pubkey);
      }
    } else {
      callback(PrivyError.REQUEST_REJECTED);
    }
  };

  const nonce = generateNonce();
  const signature = signMessage(nonce);
  const request: ProxyRequest = {
    pubkey: getPublicKeyString(),
    nonce: nonce,
    signature: signature,
  };

  subscribeToTopic(nonce, _handleResponse);
  console.info(
    `Publishing proxy request to ${proxy_candidate.address}/request/proxy...`
  );
  publishToTopic(
    `${proxy_candidate.address}/request/proxy`,
    JSON.stringify(request)
  );
};

export const startProxyNode = async (proxy_pubkey: string) => {
  try {
    const response = await axios.post(
      `http://127.0.0.1/api/account/${getUserName()}/add-proxy/${proxy_pubkey}`
    );
    if (response.status != 200) {
      // handle
      // possibly an error on the router side
    } else {
      // do nothing, all good
    }
  } catch (error) {
    // handle
    // possibly router is down, save request and retry later
  }
};

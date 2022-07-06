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
import { getContactByPublicKey } from "./contactService";
import { saveContact } from "../repo/contactRepo";

export const sendProxyrequest = async (
  proxy_candidate: PrivyContact,
  callback: (err?: PrivyError) => void
) => {
  const _handleResponse = async (msg: Message) => {
    const response = JSON.parse(msg.data.toString()) as ProxyRequestResponse;
    console.info(`Received response to proxy request: ${JSON.stringify(response)}`);
    if (response.status === "accepted") {
      const verified = verifySignature(
        response.nonce,
        response.signature,
        response.pubkey
      );

      if (!verified) {
        callback(PrivyError.INVALID_SIGNATURE);
        return;
      }
      const contact = await getContactByPublicKey(response.pubkey);
      if (!contact) {
        callback(PrivyError.NOT_TRUSTED);
        return;
      }
      if (!contact.trusted) {
        callback(PrivyError.NOT_TRUSTED);
        return;
      }
      // contact.proxy = true;
      // await saveContact(contact);
      await startProxyNode(response.token, response.pubkey);

      // respond to response with token
      const token = response.nonce + "|" + signMessage(response.nonce);
      const renonce = generateNonce();
      const rerespons: ProxyRequestResponse = {
        status: "accepted",
        pubkey: getPublicKeyString(),
        nonce: renonce,
        signature: signMessage(renonce),
        token: token,
      };

      console.info(`Sending proxy request response to ${response.nonce}`);
      await publishToTopic(response.nonce, JSON.stringify(rerespons));
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

  await subscribeToTopic(nonce, _handleResponse);
  console.info(
    `Publishing proxy request to ${proxy_candidate.address}/request/proxy...`
  );
  publishToTopic(
    `${proxy_candidate.address}/request/proxy`,
    JSON.stringify(request)
  );
};

export const startProxyNode = async (token: string, proxy_pubkey: string) => {
  console.info(`Sending proxy start request to router...`);
  try {
    const response = await axios.post(
      `http://127.0.0.1:6130/api/account/node/add-proxy`,
      { to: getUserName(), proxy_pubkey: proxy_pubkey, token: token }
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
    console.log(error);
  }
};

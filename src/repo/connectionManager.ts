import { getIpfsInstance } from "../service/ipfsService";
const OrbitDb = require("orbit-db");

let _orbitdb: any = null;
let _incomingMessageRepo: any = null;
let _outgoingMessageRepo: any = null;
let _contactRepo: any = null;

export const initOrbitDb = async () => {
  if (!_orbitdb) {
    const ipfs = getIpfsInstance();
    _orbitdb = await OrbitDb.createInstance(ipfs);
  }
};

export const getWriteKey = () => _orbitdb?.identity.id;
export const verifyAddress = (addr: string) => OrbitDb.isValidAddress(addr);

// in case of remote nodes, this function allows to check
// if tables exist already, hence avoiding the cloning process upon startup
export const checkRepos = async () => {
  // the localOnly flag makes it so that open throws error if db can't be found locally
  try {
    await _orbitdb.open("incoming_messages", { localOnly: true });
    await _orbitdb.open("outgoing_messages", { localOnly: true });
    await _orbitdb.open("contacts", { localOnly: true });
  } catch (error) {
    console.info(error);
    return false;
  }
  return true;
};

export const initMessageRepo = async () => {
  console.info("Initializing message repo...");
  _incomingMessageRepo = await _orbitdb?.docstore("incoming_messages", {
    indexBy: "hash",
    accessController: {
      type: "orbitdb",
      write: [getWriteKey()],
    },
  });
  _incomingMessageRepo.load();

  _outgoingMessageRepo = await _orbitdb?.docstore("outgoing_messages", {
    indexBy: "hash",
    accessController: {
      type: "orbitdb",
      write: [getWriteKey()],
    },
  });
  _outgoingMessageRepo.load();
  console.info(
    `Incoming message repo initialized at ${_incomingMessageRepo.address.toString()}`
  );
  console.info(
    `Outgoing message repo initialized at ${_outgoingMessageRepo.address.toString()}`
  );
};

export const cloneIncomingMessageRepo = async (incomingDbAddr: string) => {
  console.info("Cloning incoming message repo...");

  _incomingMessageRepo = await _orbitdb?.docstore(incomingDbAddr, {
    indexBy: "hash",
  });
  _incomingMessageRepo.load();

  console.info(
    `Incoming message repo cloned at ${_incomingMessageRepo.address.toString()}`
  );
};

export const cloneOutgoingMessageRepo = async (outgoingDbAddr: string) => {
  console.info("Cloning outgoing message repo...");

  _outgoingMessageRepo = await _orbitdb?.docstore(outgoingDbAddr, {
    indexBy: "hash",
  });
  _outgoingMessageRepo.load();

  console.info(
    `Outgoing message repo cloned at ${_outgoingMessageRepo.address.toString()}`
  );
};

export const getIncomingMessageRepo = () => _incomingMessageRepo;
export const getOutgoingMessageRepo = () => _outgoingMessageRepo;

export const initContactRepo = async () => {
  console.info("Initializing contact repo...");
  _contactRepo = await _orbitdb?.docstore("contacts", {
    indexBy: "hash",
    accessController: {
      type: "orbitdb",
      write: [getWriteKey()],
    },
  });
  await _contactRepo.load(1000);
  console.info(
    `Contact repo initialized at ${_contactRepo.address.toString()}`
  );
};

export const cloneContactRepo = async (dbaddr: string) => {
  console.info("Cloning contact repo...");
  _contactRepo = await _orbitdb?.docstore(dbaddr, { indexBy: "hash" });
  await _contactRepo.load(1000);
  console.info(`Contact repo cloned at ${_contactRepo.address.toString()}`);
};

export const getContactRepo = () => _contactRepo;

import { PrivyContact } from '../model/contactModel';
import {getIpfsInstance} from '../service/ipfsService';
const OrbitDb = require('orbit-db');

let _orbitdb: any = null;
let _messageRepo : any = null;
let _contactRepo : any = null;

export const initOrbitDb = async () => {
  if (!_orbitdb) {
    const ipfs = getIpfsInstance();
    _orbitdb = await OrbitDb.createInstance(ipfs);
  }
}

export const getWriteKey = () => _orbitdb?.identity.id;
export const verifyAddress = (addr: string) => OrbitDb.isValidAddress(addr);

export const initMessageRepo = async () => {
  console.log("Initializing message repo...")
  _messageRepo = await _orbitdb?.docstore('messages', {
    indexBy : 'hash',
    accessController: {
      type: 'orbitdb',
      write: [getWriteKey()]
    }
  })
  _messageRepo.load()
  console.log(`Message repo initialized at ${_messageRepo.address.toString()}`)
}

export const cloneMessageRepo = async (dbaddr : string) => {
  console.log("Cloning message repo...")
  
  _messageRepo = await _orbitdb?.docstore(dbaddr, {indexBy : 'hash'})
  _messageRepo.load()
  console.log(`Message repo cloned at ${_messageRepo.address.toString()}`)
}

export const getMessageRepo = () => _messageRepo;

export const initContactRepo = async (self : PrivyContact) => {
  console.log("Initializing contact repo...")
  _contactRepo = await _orbitdb?.docstore('contacts', {
    indexBy : 'hash',
    accessController: {
      type: 'orbitdb',
      write: [getWriteKey()]
    }});
  await _contactRepo.load(1000);
  await _contactRepo.put(self);
  console.log(`Contact repo initialized at ${_contactRepo.address.toString()}`);
}

export const cloneContactRepo = async (dbaddr : string) => {
  console.log("Cloning contact repo...")
  _contactRepo = await _orbitdb?.docstore(dbaddr, {indexBy : 'hash'})
  await _contactRepo.load(1000)
  console.log(`Contact repo cloned at ${_contactRepo.address.toString()}`)
}

export const getContactRepo = () => _contactRepo
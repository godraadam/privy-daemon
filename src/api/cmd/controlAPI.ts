import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { PrivyContact } from "../../model/contactModel";
import { PrivyError } from "../../model/errors";
import { initContactRepo, initMessageRepo, initOrbitDb } from "../../repo/connectionManager";
import { fetchContactRepoAddrAndClone, fetchMessageRepoAddrAndClone } from "../../service/addressService";
import { generateIdentity, getPublicKeyString, getUserAddress } from "../../service/identityService";
import { initIpfs, subscribeToTopic } from "../../service/ipfsService";
import { sha256 } from "../../util/crypto";
import { handleMessage } from "../privy/messageApi";
import { handleCloneRequest, handleProxyRequest } from "../privy/requestAPI";


export const controlRouter = Router();

export type NodeType = 'origin' | 'remote' | 'proxy'
let inited : boolean = false;

controlRouter.post('/init', async (req, res) => {
    if (inited) {
        res.status(StatusCodes.OK).send('Already initialized');
        return;
    }
    
    // startup internal ipfs node
    await initIpfs();
    
    // initialize orbitdb instance
    await initOrbitDb();
    
    const body = req.body;
    
    switch(body.nodetype) {
    case 'origin':
        generateIdentity(body.passphrase, body.username)
        await initMessageRepo();
        const self : PrivyContact = {
            alias:body.username,
            pubkey:getPublicKeyString(),
            address:sha256(getPublicKeyString()),
            trusted:true,
            hash:sha256(body.username)
        }
        await initContactRepo(self);
        subscribeToTopic(getUserAddress() + '/inbox', handleMessage);
        subscribeToTopic(getUserAddress() + '/request/clone', handleCloneRequest);
        subscribeToTopic(getUserAddress() + '/request/proxy', handleProxyRequest);
        res.sendStatus(StatusCodes.OK);
        inited = true;
        break;
    case 'remote':
        generateIdentity(body.passphrase, body.username)
        await fetchMessageRepoAddrAndClone(async (err? : PrivyError) => {
            if (err) {
                res.status(StatusCodes.BAD_REQUEST).send(err.toString());
            }
            await fetchContactRepoAddrAndClone((err? : PrivyError) => {
                if (err) {
                    res.status(StatusCodes.BAD_REQUEST).send(err.toString());
                }
                subscribeToTopic(getUserAddress() + '/inbox', handleMessage);
                subscribeToTopic(getUserAddress() + '/request/clone', handleCloneRequest);
                subscribeToTopic(getUserAddress() + '/request/proxy', handleProxyRequest);
                res.sendStatus(StatusCodes.OK);
            }
        )})
        inited = true;
        break;
    case 'proxy':
        res.status(StatusCodes.IM_A_TEAPOT).send('Not yet implemented')
        break;
    default:
        res.status(StatusCodes.BAD_REQUEST).send('Invalid node type');
    }
})

controlRouter.post('/uninit', (req, res) => {
    res.status(StatusCodes.IM_A_TEAPOT).send('Not yet implemented')
})

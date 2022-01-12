import { cryptico } from '@daotl/cryptico';
import crypto from 'crypto'
import { getRSAKey, getSharedPublicKeyString, getSharedRSAKey } from '../service/identityService';

export const sha256 = (data : string) => crypto.createHash('sha256').update(data).digest('base64')

export const generateNonce = () => crypto.randomBytes(256).toString('base64');

export const signMessage = (msg : string) => {
    const result = cryptico.encrypt(msg, getSharedPublicKeyString(), getRSAKey());
    if (result.status !== 'success') {
        return null;
    }
    return (result as any).cipher;
}

export const verifySignature = (message: string, signature : string, pubkey : string) => {
    const result = cryptico.decrypt(signature, getSharedRSAKey())
    if (result.status !== 'success') {
        return false;
    }
    return result.signature === 'verified' && result.publicKeyString === pubkey && result.plaintext === message;
}

export const encryptMessage = (plaintext : string, pubkey : string) => {
    const result = cryptico.encrypt(plaintext, pubkey, getSharedRSAKey());
    if (result.status !== 'success') {
        return null;
    }
    return (result as any).cipher;
}

export const decryptMessage = (ciphertext : string) => {
    const result = cryptico.decrypt(ciphertext, getRSAKey());
    if (result.status !== 'success') {
        return null;
    }
    return result.plaintext;
}
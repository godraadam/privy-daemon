import { cryptico } from "@daotl/cryptico"
import { PrivyMessage } from "../model/messageModel"
import { saveMessage } from "../repo/messageRepo";
import { getPublicKeyString, getSharedRSAKey } from "./identityService"

export const addMessage = async (msg : PrivyMessage) => {
    //encrypt and sign with shared key, then save
    const encryptionResult = cryptico.encrypt(JSON.stringify(msg), getPublicKeyString(), getSharedRSAKey());
    if (encryptionResult.status == 'success') {
        await saveMessage((encryptionResult as any).ciphertext)
    }
}
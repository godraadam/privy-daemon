import { Message } from 'ipfs-core-types/src/pubsub'
import { cryptico } from '@daotl/cryptico'
import { getRSAKey } from '../../service/identityService'
import { PrivyMessage } from '../../model/messageModel'
import { addMessage } from '../../service/messageService'

export const handleMessage = async (msg : Message) => {
    //verify signature
    const decryptionResult = cryptico.decrypt(msg.data.toString(), getRSAKey())
    if (decryptionResult.status == "success" ) {
        if (decryptionResult.signature == "verified") {
           const msgObject = JSON.parse(decryptionResult.plaintext) as PrivyMessage
           
           // log to console
           console.log(`${msgObject.from} says: ${msgObject.content}`);
           
           await addMessage(msgObject);
           
        }
    }
}
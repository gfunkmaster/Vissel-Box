'use client'

import * as openpgp from 'openpgp'

/**
 * Decrypt a report's content using the tenant's private key
 * This runs entirely in the browser - the private key never leaves the client
 */
export async function decryptReport(
    encryptedContent: string,
    privateKeyArmored: string
): Promise<string> {
    const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored })

    const message = await openpgp.readMessage({
        armoredMessage: encryptedContent,
    })

    const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey,
    })

    return decrypted as string
}

/**
 * Decrypt a file using the tenant's private key
 * Returns the decrypted file as a Blob
 */
export async function decryptFile(
    encryptedData: string,
    privateKeyArmored: string,
    mimeType: string
): Promise<Blob> {
    const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored })

    const message = await openpgp.readMessage({
        armoredMessage: encryptedData,
    })

    const { data: decrypted } = await openpgp.decrypt({
        message,
        decryptionKeys: privateKey,
        format: 'binary',
    })

    const uint8 = decrypted as Uint8Array
    const arrayBuffer = new ArrayBuffer(uint8.byteLength)
    new Uint8Array(arrayBuffer).set(uint8)
    return new Blob([arrayBuffer], { type: mimeType })
}

export interface EncryptedAttachment {
    name: string
    type: string
    size: number
    data: string
}

/**
 * Decrypt all attachments from a report
 */
export async function decryptAttachments(
    encryptedAttachmentsJson: string,
    privateKeyArmored: string
): Promise<{ name: string; blob: Blob }[]> {
    const attachments: EncryptedAttachment[] = JSON.parse(encryptedAttachmentsJson)

    return Promise.all(
        attachments.map(async (attachment) => ({
            name: attachment.name,
            blob: await decryptFile(attachment.data, privateKeyArmored, attachment.type),
        }))
    )
}

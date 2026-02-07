'use client'

import * as openpgp from 'openpgp'

/**
 * Encrypt a report's content using the tenant's public key
 * This runs entirely in the browser - plaintext never leaves the client
 */
export async function encryptReport(
    content: string,
    publicKeyArmored: string
): Promise<string> {
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored })

    const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ text: content }),
        encryptionKeys: publicKey,
    })

    return encrypted as string
}

/**
 * Encrypt a file using the tenant's public key
 * Returns base64-encoded encrypted data
 */
export async function encryptFile(
    file: File,
    publicKeyArmored: string
): Promise<string> {
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored })
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const encrypted = await openpgp.encrypt({
        message: await openpgp.createMessage({ binary: uint8Array }),
        encryptionKeys: publicKey,
        format: 'armored',
    })

    return encrypted as string
}

/**
 * Encrypt multiple files and return them as a JSON string
 */
export async function encryptAttachments(
    files: File[],
    publicKeyArmored: string
): Promise<string> {
    const encryptedFiles = await Promise.all(
        files.map(async (file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
            data: await encryptFile(file, publicKeyArmored),
        }))
    )

    return JSON.stringify(encryptedFiles)
}

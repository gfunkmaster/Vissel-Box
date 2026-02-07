'use client'

import * as openpgp from 'openpgp'

export interface KeyPair {
    publicKey: string
    privateKey: string
}

/**
 * Generate a new PGP key pair for a tenant
 * This runs entirely in the browser - the private key never leaves the client
 */
export async function generateKeyPair(
    name: string,
    email: string
): Promise<KeyPair> {
    const { privateKey, publicKey } = await openpgp.generateKey({
        type: 'rsa',
        rsaBits: 4096,
        userIDs: [{ name, email }],
        format: 'armored',
    })

    return {
        publicKey,
        privateKey,
    }
}

/**
 * Export private key as a downloadable file
 */
export function downloadPrivateKey(privateKey: string, filename: string): void {
    const blob = new Blob([privateKey], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Validate that a string is a valid PGP public key
 */
export async function validatePublicKey(armoredKey: string): Promise<boolean> {
    try {
        await openpgp.readKey({ armoredKey })
        return true
    } catch {
        return false
    }
}

/**
 * Validate that a string is a valid PGP private key
 */
export async function validatePrivateKey(armoredKey: string): Promise<boolean> {
    try {
        await openpgp.readPrivateKey({ armoredKey })
        return true
    } catch {
        return false
    }
}

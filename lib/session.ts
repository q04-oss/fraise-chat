/**
 * fraise-chat — Session manager
 *
 * Orchestrates X3DH key agreement and Double Ratchet sessions.
 * Called by the messaging layer to encrypt/decrypt messages.
 *
 * Licensed under GPL v3 — Copyright (c) 2026 Rajzyngier Research
 */

import {
  x3dhSend,
  x3dhReceive,
  initSendRatchet,
  initRecvRatchet,
  ratchetEncrypt,
  ratchetDecrypt,
  encryptedMessageToWire,
  encryptedMessageFromWire,
  PreKeyBundle,
} from './crypto'
import {
  getIdentityKey,
  getSignedPreKey,
  getSession,
  saveSession,
  hasSession,
  consumeOneTimePreKey,
} from './keyStore'

// ─── Send ─────────────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext message for a recipient.
 * Establishes a session via X3DH if one doesn't exist yet.
 *
 * Returns a wire-encoded string to send to the server.
 */
export async function encryptForRecipient(
  recipientId: number,
  plaintext: string,
  fetchPreKeyBundle: (userId: number) => Promise<PreKeyBundle>
): Promise<string> {
  const identity = await getIdentityKey()

  let state = await getSession(recipientId)

  if (!state) {
    // First message — establish session via X3DH
    const bundle = await fetchPreKeyBundle(recipientId)
    const { masterSecret, ephemeralKey } = x3dhSend(identity, bundle)
    state = initSendRatchet(masterSecret, bundle.identityKey)
  }

  const { state: newState, message } = ratchetEncrypt(state, plaintext)
  await saveSession(recipientId, newState)

  return encryptedMessageToWire(message)
}

// ─── Receive ──────────────────────────────────────────────────────────────────

/**
 * Decrypt a wire-encoded message from a sender.
 * Establishes a receive session if this is the first message.
 */
export async function decryptFromSender(
  senderId: number,
  wireMessage: string,
  senderIdentityKey?: Uint8Array,
  senderEphemeralKey?: Uint8Array,
  oneTimePreKeyId?: number
): Promise<string> {
  let state = await getSession(senderId)

  if (!state) {
    if (!senderIdentityKey || !senderEphemeralKey) {
      throw new Error('Session not established and no X3DH parameters provided')
    }

    const recipientIdentity   = await getIdentityKey()
    const recipientSignedPreKey = await getSignedPreKey()
    const oneTimePreKey = oneTimePreKeyId != null
      ? await consumeOneTimePreKey(oneTimePreKeyId) ?? undefined
      : undefined

    const masterSecret = x3dhReceive(
      recipientIdentity,
      recipientSignedPreKey,
      senderIdentityKey,
      senderEphemeralKey,
      oneTimePreKey
    )

    state = initRecvRatchet(masterSecret, recipientSignedPreKey)
  }

  const encMsg = encryptedMessageFromWire(wireMessage)
  const { state: newState, plaintext } = ratchetDecrypt(state, encMsg)
  await saveSession(senderId, newState)

  return plaintext
}

// ─── Key Registration ─────────────────────────────────────────────────────────

/**
 * Build the registration payload to upload public keys to the server.
 * Private keys never leave the client.
 */
export async function buildKeyRegistration() {
  const identity    = await getIdentityKey()
  const signedPreKey = await getSignedPreKey()

  return {
    identityKey: Array.from(identity.publicKey),
    signedPreKey: Array.from(signedPreKey.publicKey),
  }
}

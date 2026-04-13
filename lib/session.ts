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
  RatchetState,
} from './crypto'
import {
  getIdentityKey,
  getSignedPreKey,
  getSession,
  saveSession,
  hasSession,
  getOneTimePreKeyPair,
  consumeOneTimePreKey,
} from './keyStore'

// ─── Send ─────────────────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext message for a recipient.
 * Establishes a session via X3DH if one doesn't exist yet.
 *
 * Returns { wire, newState } — the caller MUST save newState only after
 * the HTTP POST succeeds to avoid ratchet desync on delivery failure.
 *
 * On first message, the wire envelope includes X3DH bootstrap fields
 * (ephemeralKey, senderIdentityKey, oneTimePreKeyId) so the recipient
 * can perform X3DH and decrypt.
 */
export async function encryptForRecipient(
  recipientId: number,
  plaintext: string,
  fetchPreKeyBundle: (userId: number) => Promise<PreKeyBundle>
): Promise<{ wire: string; newState: RatchetState }> {
  const identity = await getIdentityKey()

  let state = await getSession(recipientId)
  let bootstrap: Record<string, unknown> = {}

  if (!state) {
    // First message — establish session via X3DH
    const bundle = await fetchPreKeyBundle(recipientId)
    const { masterSecret, ephemeralKey } = x3dhSend(identity, bundle)
    state = initSendRatchet(masterSecret, bundle.identityKey)
    // Embed bootstrap data so recipient can perform X3DH on first receive
    bootstrap = {
      ek:   btoa(String.fromCharCode(...ephemeralKey.publicKey)),
      sik:  btoa(String.fromCharCode(...identity.publicKey)),
      otpId: bundle.oneTimePreKeyId ?? null,
    }
  }

  const { state: newState, message } = ratchetEncrypt(state, plaintext)
  const wire = JSON.stringify({ ...bootstrap, msg: encryptedMessageToWire(message) })

  // newState is returned to caller — do NOT save here.
  // Caller must save only after the HTTP POST succeeds.
  return { wire, newState }
}

// ─── Receive ──────────────────────────────────────────────────────────────────

/**
 * Decrypt a wire-encoded message from a sender.
 * Establishes a receive session if this is the first message.
 *
 * The wire envelope produced by encryptForRecipient embeds X3DH bootstrap
 * data (ek, sik, otpId) for the first message so no separate parameters
 * are needed — everything is parsed from the envelope.
 */
export async function decryptFromSender(
  senderId: number,
  wireMessage: string
): Promise<string> {
  // Parse the envelope — first messages include bootstrap fields
  const envelope = JSON.parse(wireMessage) as {
    msg: string
    ek?: string
    sik?: string
    otpId?: number | null
  }

  let state = await getSession(senderId)
  let consumedOtpId: number | null = null

  if (!state) {
    const { ek, sik, otpId } = envelope
    if (!ek || !sik) {
      throw new Error('Session not established and no X3DH bootstrap data in envelope')
    }

    const b64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))
    const senderEphemeralKey  = b64(ek)
    const senderIdentityKey   = b64(sik)

    const recipientIdentity     = await getIdentityKey()
    const recipientSignedPreKey = await getSignedPreKey()

    // Read OTP key without consuming — consume only after session is durable (fix 7)
    const oneTimePreKey = (otpId != null)
      ? await getOneTimePreKeyPair(otpId) ?? undefined
      : undefined

    const masterSecret = x3dhReceive(
      recipientIdentity,
      recipientSignedPreKey,
      senderIdentityKey,
      senderEphemeralKey,
      oneTimePreKey
    )

    state = initRecvRatchet(masterSecret, recipientSignedPreKey)
    if (otpId != null) consumedOtpId = otpId
  }

  const encMsg = encryptedMessageFromWire(envelope.msg)
  const { state: newState, plaintext } = ratchetDecrypt(state, encMsg)

  // Save session first — then mark OTP key used so we never consume without a durable session
  await saveSession(senderId, newState)
  if (consumedOtpId != null) {
    await consumeOneTimePreKey(consumedOtpId)
  }

  return plaintext
}

// ─── Key Registration ─────────────────────────────────────────────────────────

/**
 * Build the registration payload to upload public keys to the server.
 * Private keys never leave the client.
 */
export async function buildKeyRegistration() {
  const identity     = await getIdentityKey()
  const signedPreKey = await getSignedPreKey()

  // Sign the signed pre-key with the identity key so recipients can verify it
  const { hmac } = await import('@noble/hashes/hmac')
  const { sha256 } = await import('@noble/hashes/sha256')
  const signature = hmac(sha256, identity.privateKey, signedPreKey.publicKey)

  return {
    identityKey:    btoa(String.fromCharCode(...identity.publicKey)),
    signedPreKey:   btoa(String.fromCharCode(...signedPreKey.publicKey)),
    signedPreKeySig: btoa(String.fromCharCode(...signature)),
  }
}

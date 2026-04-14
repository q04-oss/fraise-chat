/**
 * fraise-chat — Signal Protocol crypto layer
 *
 * Implements the core Signal Protocol primitives using @noble/curves,
 * @noble/ciphers, and @noble/hashes. Pure TypeScript, browser + Node compatible.
 *
 * Architecture:
 *   - X25519 for ECDH key agreement
 *   - AES-256-GCM for symmetric encryption
 *   - HMAC-SHA256 for KDF/MAC
 *   - Double Ratchet for forward secrecy
 *
 * Licensed under GPL v3 — Copyright (c) 2026 Rajzyngier Research
 */

import { x25519 } from '@noble/curves/ed25519'
import { gcm } from '@noble/ciphers/aes'
import { hkdf } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha256'
import { hmac } from '@noble/hashes/hmac'
import { randomBytes } from '@noble/ciphers/webcrypto'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeyPair {
  publicKey: Uint8Array   // 32 bytes, X25519
  privateKey: Uint8Array  // 32 bytes, X25519
}

export interface PreKeyBundle {
  userId: number
  identityKey: Uint8Array
  signedPreKey: Uint8Array
  signedPreKeySignature: Uint8Array
  oneTimePreKey?: Uint8Array
  oneTimePreKeyId?: number
}

export interface RatchetState {
  rootKey: Uint8Array
  sendChainKey: Uint8Array
  recvChainKey: Uint8Array
  sendCount: number
  recvCount: number
  dhSendKey: KeyPair
  dhRecvKey: Uint8Array | null
}

export interface EncryptedMessage {
  ciphertext: Uint8Array
  iv: Uint8Array
  ephemeralKey: Uint8Array  // sender's current DH ratchet public key
  messageCount: number
}

// ─── Key Generation ────────────────────────────────────────────────────────────

export function generateKeyPair(): KeyPair {
  const privateKey = randomBytes(32)
  const publicKey = x25519.getPublicKey(privateKey)
  return { publicKey, privateKey }
}

// ─── ECDH ─────────────────────────────────────────────────────────────────────

export function ecdh(privateKey: Uint8Array, publicKey: Uint8Array): Uint8Array {
  return x25519.getSharedSecret(privateKey, publicKey)
}

// ─── KDF ──────────────────────────────────────────────────────────────────────

const KDF_INFO_ROOT    = new TextEncoder().encode('fraise-root')
const KDF_INFO_CHAIN   = new TextEncoder().encode('fraise-chain')
const KDF_INFO_MESSAGE = new TextEncoder().encode('fraise-message')

/** Derive root key + chain key from DH output and existing root key */
export function kdfRoot(
  rootKey: Uint8Array,
  dhOutput: Uint8Array
): { newRootKey: Uint8Array; chainKey: Uint8Array } {
  const derived = hkdf(sha256, dhOutput, rootKey, KDF_INFO_ROOT, 64)
  return {
    newRootKey: derived.slice(0, 32),
    chainKey: derived.slice(32, 64),
  }
}

/** Derive message key + next chain key from chain key */
export function kdfChain(chainKey: Uint8Array): {
  messageKey: Uint8Array
  nextChainKey: Uint8Array
} {
  const messageKey   = hmac(sha256, chainKey, new Uint8Array([1]))
  const nextChainKey = hmac(sha256, chainKey, new Uint8Array([2]))
  return { messageKey, nextChainKey }
}

// ─── Symmetric Encrypt / Decrypt ──────────────────────────────────────────────

export function encryptMessage(messageKey: Uint8Array, plaintext: string): {
  ciphertext: Uint8Array
  iv: Uint8Array
} {
  const iv = randomBytes(12)
  const aes = gcm(messageKey, iv)
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = aes.encrypt(encoded)
  return { ciphertext, iv }
}

export function decryptMessage(
  messageKey: Uint8Array,
  ciphertext: Uint8Array,
  iv: Uint8Array
): string {
  const aes = gcm(messageKey, iv)
  const plaintext = aes.decrypt(ciphertext)
  return new TextDecoder().decode(plaintext)
}

// ─── X3DH Key Agreement (session initiation) ──────────────────────────────────

/**
 * Perform X3DH to establish a shared secret with a recipient.
 * Called by the sender when starting a new conversation.
 *
 * Returns: master secret + ephemeral public key to send to recipient
 */
export function x3dhSend(
  senderIdentity: KeyPair,
  recipientBundle: PreKeyBundle
): { masterSecret: Uint8Array; ephemeralKey: KeyPair } {
  const ephemeral = generateKeyPair()

  // DH1 = DH(senderIdentity, recipientSignedPreKey)
  const dh1 = ecdh(senderIdentity.privateKey, recipientBundle.signedPreKey)
  // DH2 = DH(ephemeral, recipientIdentityKey)
  const dh2 = ecdh(ephemeral.privateKey, recipientBundle.identityKey)
  // DH3 = DH(ephemeral, recipientSignedPreKey)
  const dh3 = ecdh(ephemeral.privateKey, recipientBundle.signedPreKey)

  // Optionally DH4 with one-time pre-key
  const parts = recipientBundle.oneTimePreKey
    ? concat(dh1, dh2, dh3, ecdh(ephemeral.privateKey, recipientBundle.oneTimePreKey))
    : concat(dh1, dh2, dh3)

  const masterSecret = hkdf(sha256, parts, new Uint8Array(32), KDF_INFO_CHAIN, 32)
  return { masterSecret, ephemeralKey: ephemeral }
}

/**
 * Receive an X3DH session establishment.
 * Called by the recipient on first message.
 */
export function x3dhReceive(
  recipientIdentity: KeyPair,
  recipientSignedPreKey: KeyPair,
  senderIdentityKey: Uint8Array,
  senderEphemeralKey: Uint8Array,
  recipientOneTimePreKey?: KeyPair
): Uint8Array {
  const dh1 = ecdh(recipientSignedPreKey.privateKey, senderIdentityKey)
  const dh2 = ecdh(recipientIdentity.privateKey, senderEphemeralKey)
  const dh3 = ecdh(recipientSignedPreKey.privateKey, senderEphemeralKey)

  const parts = recipientOneTimePreKey
    ? concat(dh1, dh2, dh3, ecdh(recipientOneTimePreKey.privateKey, senderEphemeralKey))
    : concat(dh1, dh2, dh3)

  return hkdf(sha256, parts, new Uint8Array(32), KDF_INFO_CHAIN, 32)
}

// ─── Double Ratchet ───────────────────────────────────────────────────────────

/** Initialise ratchet state for the sender after X3DH */
export function initSendRatchet(masterSecret: Uint8Array, recipientIdentityKey: Uint8Array): RatchetState {
  const dhSendKey = generateKeyPair()
  const dhOutput  = ecdh(dhSendKey.privateKey, recipientIdentityKey)
  const { newRootKey, chainKey } = kdfRoot(masterSecret, dhOutput)

  return {
    rootKey: newRootKey,
    sendChainKey: chainKey,
    recvChainKey: new Uint8Array(32),
    sendCount: 0,
    recvCount: 0,
    dhSendKey,
    dhRecvKey: recipientIdentityKey,
  }
}

/** Initialise ratchet state for the receiver after X3DH */
export function initRecvRatchet(masterSecret: Uint8Array, recipientSignedPreKey: KeyPair): RatchetState {
  return {
    rootKey: masterSecret,
    sendChainKey: new Uint8Array(32),
    recvChainKey: new Uint8Array(32),
    sendCount: 0,
    recvCount: 0,
    dhSendKey: recipientSignedPreKey,
    dhRecvKey: null,
  }
}

/** Encrypt a message, advancing the send chain */
export function ratchetEncrypt(
  state: RatchetState,
  plaintext: string
): { state: RatchetState; message: EncryptedMessage } {
  const { messageKey, nextChainKey } = kdfChain(state.sendChainKey)
  const { ciphertext, iv } = encryptMessage(messageKey, plaintext)

  const message: EncryptedMessage = {
    ciphertext,
    iv,
    ephemeralKey: state.dhSendKey.publicKey,
    messageCount: state.sendCount,
  }

  return {
    state: { ...state, sendChainKey: nextChainKey, sendCount: state.sendCount + 1 },
    message,
  }
}

/** Decrypt a message, advancing the receive chain (and ratcheting DH if needed) */
export function ratchetDecrypt(
  state: RatchetState,
  message: EncryptedMessage
): { state: RatchetState; plaintext: string } {
  let current = state

  // DH ratchet step if the sender's DH key has changed
  const ephemeralKey = message.ephemeralKey
  if (!current.dhRecvKey || !bytesEqual(ephemeralKey, current.dhRecvKey)) {
    const dhOutput = ecdh(current.dhSendKey.privateKey, ephemeralKey)
    const { newRootKey, chainKey } = kdfRoot(current.rootKey, dhOutput)
    const newDhSend = generateKeyPair()
    const dhOutput2 = ecdh(newDhSend.privateKey, ephemeralKey)
    const { newRootKey: newRootKey2, chainKey: sendChain } = kdfRoot(newRootKey, dhOutput2)

    current = {
      ...current,
      rootKey: newRootKey2,
      recvChainKey: chainKey,
      sendChainKey: sendChain,
      dhSendKey: newDhSend,
      dhRecvKey: ephemeralKey,
      recvCount: 0,
    }
  }

  const { messageKey, nextChainKey } = kdfChain(current.recvChainKey)
  const plaintext = decryptMessage(messageKey, message.ciphertext, message.iv)

  return {
    state: { ...current, recvChainKey: nextChainKey, recvCount: current.recvCount + 1 },
    plaintext,
  }
}

// ─── Serialisation ────────────────────────────────────────────────────────────

export function encryptedMessageToWire(msg: EncryptedMessage): string {
  return btoa(JSON.stringify({
    ct: Array.from(msg.ciphertext),
    iv: Array.from(msg.iv),
    ek: Array.from(msg.ephemeralKey),
    mc: msg.messageCount,
  }))
}

export function encryptedMessageFromWire(raw: string): EncryptedMessage {
  const { ct, iv, ek, mc } = JSON.parse(atob(raw))
  return {
    ciphertext: new Uint8Array(ct),
    iv: new Uint8Array(iv),
    ephemeralKey: new Uint8Array(ek),
    messageCount: mc,
  }
}

export function keyPairToStorable(kp: KeyPair): { pub: number[]; priv: number[] } {
  return { pub: Array.from(kp.publicKey), priv: Array.from(kp.privateKey) }
}

export function keyPairFromStorable(s: { pub: number[]; priv: number[] }): KeyPair {
  return { publicKey: new Uint8Array(s.pub), privateKey: new Uint8Array(s.priv) }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) {
    out.set(a, offset)
    offset += a.length
  }
  return out
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

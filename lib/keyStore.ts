/**
 * fraise-chat — IndexedDB-backed key store
 *
 * Stores identity keys, pre-keys, and ratchet session state client-side.
 * The server never receives private keys.
 *
 * Licensed under GPL v3 — Copyright (c) 2026 Rajzyngier Research
 */

import { openDB, IDBPDatabase } from 'idb'
import {
  KeyPair,
  RatchetState,
  generateKeyPair,
  keyPairToStorable,
  keyPairFromStorable,
} from './crypto'

const DB_NAME    = 'fraise-keys'
const DB_VERSION = 1

// ─── DB Schema ────────────────────────────────────────────────────────────────

interface FraiseKeyDB {
  identity: {
    key: 'identity' | 'signedPreKey'
    value: { pub: number[]; priv: number[] }
  }
  oneTimePreKeys: {
    key: number
    value: { id: number; pub: number[]; priv: number[]; used: boolean }
  }
  sessions: {
    key: number  // recipient userId
    value: {
      userId: number
      rootKey: number[]
      sendChainKey: number[]
      recvChainKey: number[]
      sendCount: number
      recvCount: number
      dhSendKeyPub: number[]
      dhSendKeyPriv: number[]
      dhRecvKey: number[] | null
    }
  }
}

async function getDB(): Promise<IDBPDatabase<FraiseKeyDB>> {
  return openDB<FraiseKeyDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('identity', { keyPath: 'key' as any })
      db.createObjectStore('oneTimePreKeys', { keyPath: 'id' })
      db.createObjectStore('sessions', { keyPath: 'userId' })
    },
  })
}

// ─── Identity Keys ────────────────────────────────────────────────────────────

/** Get or create the long-term identity key pair */
export async function getIdentityKey(): Promise<KeyPair> {
  const db = await getDB()
  const stored = await db.get('identity', 'identity' as any)
  if (stored) return keyPairFromStorable(stored as any)

  const kp = generateKeyPair()
  await db.put('identity', { key: 'identity', ...keyPairToStorable(kp) } as any)
  return kp
}

/** Get or create the signed pre-key */
export async function getSignedPreKey(): Promise<KeyPair> {
  const db = await getDB()
  const stored = await db.get('identity', 'signedPreKey' as any)
  if (stored) return keyPairFromStorable(stored as any)

  const kp = generateKeyPair()
  await db.put('identity', { key: 'signedPreKey', ...keyPairToStorable(kp) } as any)
  return kp
}

// ─── One-Time Pre-Keys ────────────────────────────────────────────────────────

/** Generate a batch of one-time pre-keys */
export async function generateOneTimePreKeys(count = 10): Promise<Array<{ id: number; publicKey: Uint8Array }>> {
  const db = await getDB()
  const allKeys = await db.getAll('oneTimePreKeys')
  const nextId  = allKeys.length > 0 ? Math.max(...allKeys.map(k => k.id)) + 1 : 1

  const result: Array<{ id: number; publicKey: Uint8Array }> = []
  for (let i = 0; i < count; i++) {
    const id = nextId + i
    const kp = generateKeyPair()
    await db.put('oneTimePreKeys', {
      id,
      pub: Array.from(kp.publicKey),
      priv: Array.from(kp.privateKey),
      used: false,
    })
    result.push({ id, publicKey: kp.publicKey })
  }
  return result
}

/** Retrieve and mark a one-time pre-key as used */
export async function consumeOneTimePreKey(id: number): Promise<KeyPair | null> {
  const db = await getDB()
  const stored = await db.get('oneTimePreKeys', id)
  if (!stored || stored.used) return null
  await db.put('oneTimePreKeys', { ...stored, used: true })
  return keyPairFromStorable({ pub: stored.pub, priv: stored.priv })
}

// ─── Sessions (Ratchet State) ─────────────────────────────────────────────────

export async function getSession(userId: number): Promise<RatchetState | null> {
  const db = await getDB()
  const stored = await db.get('sessions', userId)
  if (!stored) return null
  return {
    rootKey: new Uint8Array(stored.rootKey),
    sendChainKey: new Uint8Array(stored.sendChainKey),
    recvChainKey: new Uint8Array(stored.recvChainKey),
    sendCount: stored.sendCount,
    recvCount: stored.recvCount,
    dhSendKey: {
      publicKey: new Uint8Array(stored.dhSendKeyPub),
      privateKey: new Uint8Array(stored.dhSendKeyPriv),
    },
    dhRecvKey: stored.dhRecvKey ? new Uint8Array(stored.dhRecvKey) : null,
  }
}

export async function saveSession(userId: number, state: RatchetState): Promise<void> {
  const db = await getDB()
  await db.put('sessions', {
    userId,
    rootKey: Array.from(state.rootKey),
    sendChainKey: Array.from(state.sendChainKey),
    recvChainKey: Array.from(state.recvChainKey),
    sendCount: state.sendCount,
    recvCount: state.recvCount,
    dhSendKeyPub: Array.from(state.dhSendKey.publicKey),
    dhSendKeyPriv: Array.from(state.dhSendKey.privateKey),
    dhRecvKey: state.dhRecvKey ? Array.from(state.dhRecvKey) : null,
  })
}

export async function hasSession(userId: number): Promise<boolean> {
  const db = await getDB()
  const stored = await db.get('sessions', userId)
  return !!stored
}

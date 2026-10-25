import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createAccessToken,
  generateRefreshSecret,
  hashPassword,
  hashRefreshSecret,
  verifyAccessToken,
  verifyPassword,
} from './auth-crypto.js'

test('password hashes verify only the original password', async () => {
  const hash = await hashPassword('correct horse battery staple')

  assert.equal(await verifyPassword('correct horse battery staple', hash), true)
  assert.equal(await verifyPassword('incorrect password', hash), false)
})

test('refresh secrets are random and stored as one-way hashes', () => {
  const first = generateRefreshSecret()
  const second = generateRefreshSecret()

  assert.notEqual(first, second)
  assert.equal(first.length, 43)
  assert.notEqual(hashRefreshSecret(first), first)
  assert.equal(hashRefreshSecret(first).length, 64)
})

test('access tokens include user and session claims and reject tampering', async () => {
  const token = await createAccessToken('user-id', 'session-id')
  const claims = await verifyAccessToken(token)

  assert.equal(claims.sub, 'user-id')
  assert.equal(claims.sid, 'session-id')
  await assert.rejects(() => verifyAccessToken(`${token}tampered`))
})

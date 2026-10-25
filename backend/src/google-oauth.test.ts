import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createOAuthRandomValue,
  createPkceChallenge,
  parseGoogleIdentity,
} from './google-oauth.js'

test('accepts a verified Google email and normalizes its casing', () => {
  assert.deepEqual(
    parseGoogleIdentity(
      {
        sub: 'google-subject',
        email: ' Person@Example.com ',
        email_verified: true,
        nonce: 'expected-nonce',
      },
      'expected-nonce',
    ),
    { subject: 'google-subject', email: 'person@example.com' },
    'expected-nonce',
  )
})

test('rejects Google identities without a verified email', () => {
  assert.throws(
    () =>
      parseGoogleIdentity({
        sub: 'google-subject',
        email: 'person@example.com',
        email_verified: false,
        nonce: 'expected-nonce',
      }, 'expected-nonce'),
    /verified email/,
  )
})

test('rejects Google tokens without a stable subject or valid email', () => {
  assert.throws(
    () =>
      parseGoogleIdentity(
        {
          email: 'person@example.com',
          email_verified: true,
          nonce: 'expected-nonce',
        },
        'expected-nonce',
      ),
    /verified email/,
  )
  assert.throws(
    () =>
      parseGoogleIdentity(
        {
          sub: 'google-subject',
          email: 'not-an-email',
          email_verified: true,
          nonce: 'expected-nonce',
        },
        'expected-nonce',
      ),
    /valid verified email/,
  )
})

test('rejects an ID token issued for a different authorization nonce', () => {
  assert.throws(
    () =>
      parseGoogleIdentity(
        {
          sub: 'google-subject',
          email: 'person@example.com',
          email_verified: true,
          nonce: 'wrong-nonce',
        },
        'expected-nonce',
      ),
    /nonce/,
  )
})

test('creates a PKCE challenge from high-entropy verifier material', () => {
  const verifier = createOAuthRandomValue()
  const challenge = createPkceChallenge(verifier)

  assert.equal(verifier.length, 43)
  assert.equal(challenge.length, 43)
  assert.notEqual(challenge, verifier)
})

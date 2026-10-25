import {
  createRemoteJWKSet,
  jwtVerify,
  type JWTPayload,
} from 'jose'
import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'
import { z } from 'zod'
import { config } from './config.js'

const googleJwks = createRemoteJWKSet(
  new URL('https://www.googleapis.com/oauth2/v3/certs'),
)

export interface GoogleIdentity {
  subject: string
  email: string
}

const googleClaimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().trim().email().max(254),
  email_verified: z.literal(true),
  nonce: z.string().min(1),
})

export function parseGoogleIdentity(
  payload: JWTPayload,
  expectedNonce: string,
): GoogleIdentity {
  const claims = googleClaimsSchema.safeParse(payload)
  if (!claims.success) {
    throw new Error('Google token does not contain a valid verified email identity')
  }
  if (!constantTimeEqual(claims.data.nonce, expectedNonce)) {
    throw new Error('Google token nonce does not match the authorization request')
  }

  return {
    subject: claims.data.sub,
    email: claims.data.email.toLowerCase(),
  }
}

export function createOAuthRandomValue(): string {
  return randomBytes(32).toString('base64url')
}

export function createPkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export async function createGoogleAuthorizationUrl(
  state: string,
  nonce: string,
  codeChallenge: string,
): Promise<string> {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured')
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.search = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    access_type: 'online',
    prompt: 'select_account',
  }).toString()
  return url.toString()
}

const googleTokenResponseSchema = z.object({
  id_token: z.string().min(1),
})

export async function exchangeGoogleAuthorizationCode(
  code: string,
  codeVerifier: string,
): Promise<string> {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      redirect_uri: config.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    throw new Error(`Google token exchange failed with status ${response.status}`)
  }

  const parsed = googleTokenResponseSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new Error('Google token response did not include an ID token')
  }

  return parsed.data.id_token
}

export async function verifyGoogleIdToken(
  idToken: string,
  nonce: string,
): Promise<GoogleIdentity> {
  if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth is not configured')
  }

  const { payload } = await jwtVerify(idToken, googleJwks, {
    algorithms: ['RS256'],
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: config.GOOGLE_CLIENT_ID,
  })

  return parseGoogleIdentity(payload, nonce)
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return (
    leftBytes.length === rightBytes.length &&
    (leftBytes.length === 0 || timingSafeEqual(leftBytes, rightBytes))
  )
}

import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto'
import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { config } from './config.js'

const passwordKeyLength = 64
const scryptOptions = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }
const jwtKey = new TextEncoder().encode(config.AUTH_JWT_SECRET)

function derivePasswordKey(
  password: string,
  salt: Buffer,
  keyLength: number,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, scryptOptions, (error, key) => {
      if (error) {
        reject(error)
        return
      }
      resolve(key as Buffer)
    })
  })
}

export interface AccessTokenClaims extends JWTPayload {
  sub: string
  sid: string
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derivedKey = await derivePasswordKey(password, salt, passwordKeyLength)

  return `scrypt$${scryptOptions.N}$${scryptOptions.r}$${scryptOptions.p}$${salt.toString('hex')}$${derivedKey.toString('hex')}`
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, n, r, p, saltHex, keyHex] = storedHash.split('$')
  if (
    algorithm !== 'scrypt' ||
    n !== String(scryptOptions.N) ||
    r !== String(scryptOptions.r) ||
    p !== String(scryptOptions.p) ||
    !saltHex ||
    !keyHex ||
    !/^[0-9a-f]{32}$/i.test(saltHex) ||
    !/^[0-9a-f]{128}$/i.test(keyHex)
  ) {
    return false
  }

  const expected = Buffer.from(keyHex, 'hex')
  const actual = await derivePasswordKey(
    password,
    Buffer.from(saltHex, 'hex'),
    passwordKeyLength,
  )
  return timingSafeEqual(actual, expected)
}

export function generateRefreshSecret(): string {
  return randomBytes(32).toString('base64url')
}

export function hashRefreshSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex')
}

export async function createAccessToken(
  userId: string,
  sessionId: string,
): Promise<string> {
  return new SignJWT({ sid: sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer('veyra-api')
    .setAudience('veyra-client')
    .setSubject(userId)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(jwtKey)
}

export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, jwtKey, {
    algorithms: ['HS256'],
    issuer: 'veyra-api',
    audience: 'veyra-client',
  })

  if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
    throw new Error('Access token is missing required claims')
  }

  return payload as AccessTokenClaims
}

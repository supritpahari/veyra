import { randomUUID, timingSafeEqual } from 'node:crypto'
import {
  Router,
  type NextFunction,
  type CookieOptions,
  type Request,
  type Response,
} from 'express'
import { rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import { config, corsOrigins } from './config.js'
import { prisma } from './db.js'
import {
  createAccessToken,
  generateRefreshSecret,
  hashPassword,
  hashRefreshSecret,
  verifyPassword,
} from './auth-crypto.js'
import { requireAuthentication } from './auth-middleware.js'
import {
  createGoogleAuthorizationUrl,
  createOAuthRandomValue,
  createPkceChallenge,
  exchangeGoogleAuthorizationCode,
  verifyGoogleIdToken,
} from './google-oauth.js'

const router = Router()
const accessCookieName = 'veyra_access'
const refreshCookieName = 'veyra_refresh'
const oauthStateCookieName = 'veyra_google_state'
const oauthNonceCookieName = 'veyra_google_nonce'
const oauthVerifierCookieName = 'veyra_google_verifier'
const refreshLifetimeMs = 30 * 24 * 60 * 60 * 1000
const accessLifetimeMs = 15 * 60 * 1000
const oauthLifetimeMs = 10 * 60 * 1000
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure:
    config.NODE_ENV === 'production' ||
    config.AUTH_COOKIE_SAME_SITE === 'none',
  sameSite: config.AUTH_COOKIE_SAME_SITE,
  path: '/api/v1/auth',
}
const accessCookieOptions: CookieOptions = {
  ...cookieOptions,
  path: '/api/v1',
}
const oauthCookieOptions: CookieOptions = {
  ...cookieOptions,
  path: '/api/v1/auth/google/callback',
  maxAge: oauthLifetimeMs,
}

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(128),
})

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler(_request, response) {
    response.status(429).json({ error: { code: 'too_many_auth_attempts' } })
  },
})

function requireTrustedOrigin(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const origin = request.get('origin')
  if (origin && !corsOrigins.includes('*') && !corsOrigins.includes(origin)) {
    response.status(403).json({ error: { code: 'untrusted_origin' } })
    return
  }
  next()
}

function readRefreshCookie(request: Request) {
  const value = readCookie(request, refreshCookieName)
  if (!value) return null

  const separator = value.indexOf('.')
  if (separator < 1) return null

  const sessionId = value.slice(0, separator)
  const secret = value.slice(separator + 1)
  if (
    !/^[0-9a-f-]{36}$/i.test(sessionId) ||
    !/^[A-Za-z0-9_-]{43}$/.test(secret)
  ) {
    return null
  }

  return { sessionId, secret }
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.get('cookie')
  if (!cookieHeader) return null

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
  if (!cookie) return null
  return cookie.slice(name.length + 1)
}

function setAccessCookie(response: Response, token: string) {
  response.cookie(accessCookieName, token, {
    ...accessCookieOptions,
    maxAge: accessLifetimeMs,
  })
}

function clearAccessCookie(response: Response) {
  response.clearCookie(accessCookieName, accessCookieOptions)
}

function setRefreshCookie(
  response: Response,
  sessionId: string,
  secret: string,
  expiresAt: Date,
) {
  response.cookie(refreshCookieName, `${sessionId}.${secret}`, {
    ...cookieOptions,
    expires: expiresAt,
  })
}

function clearRefreshCookie(response: Response) {
  response.clearCookie(refreshCookieName, cookieOptions)
}

function clearOAuthCookies(response: Response) {
  for (const name of [
    oauthStateCookieName,
    oauthNonceCookieName,
    oauthVerifierCookieName,
  ]) {
    response.clearCookie(name, oauthCookieOptions)
  }
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left)
  const rightBytes = Buffer.from(right)
  return (
    leftBytes.length === rightBytes.length &&
    (leftBytes.length === 0 || timingSafeEqual(leftBytes, rightBytes))
  )
}

function redirectWithAuthResult(response: Response, result: string) {
  const redirect = new URL(config.AUTH_SUCCESS_REDIRECT_URL)
  if (result === 'success') {
    redirect.searchParams.set('auth', 'success')
  } else {
    redirect.searchParams.set('authError', result)
  }
  response.redirect(303, redirect.toString())
}

function getUserAgent(request: Request): string | null {
  return request.get('user-agent')?.slice(0, 512) ?? null
}

async function createSession(
  user: { id: string; email: string },
  request: Request,
  response: Response,
) {
  const sessionId = randomUUID()
  const secret = generateRefreshSecret()
  const expiresAt = new Date(Date.now() + refreshLifetimeMs)

  await prisma.authSession.create({
    data: {
      id: sessionId,
      userId: user.id,
      refreshTokenHash: hashRefreshSecret(secret),
      userAgent: getUserAgent(request),
      expiresAt,
    },
  })

  setAccessCookie(
    response,
    await createAccessToken(user.id, sessionId),
  )
  setRefreshCookie(response, sessionId, secret, expiresAt)
  return {
    user: { id: user.id, email: user.email },
    session: { id: sessionId, expiresAt: expiresAt.toISOString() },
  }
}

function isSameHash(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'hex')
  const rightBuffer = Buffer.from(right, 'hex')
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  )
}

router.post(
  '/register',
  authRateLimit,
  requireTrustedOrigin,
  async (request, response) => {
    const parsed = credentialsSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: 'invalid_request',
          details: parsed.error.flatten().fieldErrors,
        },
      })
      return
    }

    const passwordHash = await hashPassword(parsed.data.password)
    let user: { id: string; email: string }
    try {
      user = await prisma.user.create({
        data: {
          id: randomUUID(),
          email: parsed.data.email,
          passwordHash,
        },
        select: { id: true, email: true },
      })
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        response
          .status(409)
          .json({ error: { code: 'email_already_registered' } })
        return
      }
      throw error
    }

    response.status(201).json({
      data: await createSession(user, request, response),
    })
  },
)

router.post(
  '/login',
  authRateLimit,
  requireTrustedOrigin,
  async (request, response) => {
    const parsed = credentialsSchema.safeParse(request.body)
    if (!parsed.success) {
      response.status(400).json({
        error: {
          code: 'invalid_request',
          details: parsed.error.flatten().fieldErrors,
        },
      })
      return
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, email: true, passwordHash: true },
    })
    const passwordMatches = await verifyPassword(
      parsed.data.password,
      user?.passwordHash ??
        'scrypt$16384$8$1$00000000000000000000000000000000$00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
    )

    if (!user || !passwordMatches) {
      response.status(401).json({ error: { code: 'invalid_credentials' } })
      return
    }

    response.json({ data: await createSession(user, request, response) })
  },
)

router.get(
  '/google',
  authRateLimit,
  async (request, response) => {
    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      response
        .status(503)
        .json({ error: { code: 'google_oauth_not_configured' } })
      return
    }

    const state = createOAuthRandomValue()
    const nonce = createOAuthRandomValue()
    const verifier = createOAuthRandomValue()
    const redirectUrl = await createGoogleAuthorizationUrl(
      state,
      nonce,
      createPkceChallenge(verifier),
    )

    response.cookie(oauthStateCookieName, state, oauthCookieOptions)
    response.cookie(oauthNonceCookieName, nonce, oauthCookieOptions)
    response.cookie(oauthVerifierCookieName, verifier, oauthCookieOptions)
    if (request.query.format === 'json') {
      response.json({ data: { authorizationUrl: redirectUrl } })
      return
    }
    response.redirect(302, redirectUrl)
  },
)

router.get('/google/callback', async (request, response) => {
  const expectedState = readCookie(request, oauthStateCookieName)
  const nonce = readCookie(request, oauthNonceCookieName)
  const verifier = readCookie(request, oauthVerifierCookieName)
  clearOAuthCookies(response)

  const returnedState =
    typeof request.query.state === 'string' ? request.query.state : ''
  if (
    !expectedState ||
    !returnedState ||
    !constantTimeEqual(expectedState, returnedState) ||
    !nonce ||
    !verifier
  ) {
    redirectWithAuthResult(response, 'invalid_oauth_state')
    return
  }

  if (typeof request.query.error === 'string') {
    redirectWithAuthResult(
      response,
      request.query.error === 'access_denied'
        ? 'google_access_denied'
        : 'google_auth_failed',
    )
    return
  }

  const code = typeof request.query.code === 'string' ? request.query.code : ''
  if (!code || code.length > 4096) {
    redirectWithAuthResult(response, 'google_auth_failed')
    return
  }

  let identity
  try {
    const idToken = await exchangeGoogleAuthorizationCode(code, verifier)
    identity = await verifyGoogleIdToken(idToken, nonce)
  } catch {
    redirectWithAuthResult(response, 'google_auth_failed')
    return
  }

  let user: { id: string; email: string }
  try {
    const linkedUser = await prisma.user.findUnique({
      where: { googleSub: identity.subject },
      select: { id: true, email: true },
    })

    if (linkedUser) {
      user = linkedUser
    } else {
      const emailUser = await prisma.user.findUnique({
        where: { email: identity.email },
        select: { id: true, email: true, googleSub: true },
      })

      if (emailUser?.googleSub && emailUser.googleSub !== identity.subject) {
        redirectWithAuthResult(response, 'google_account_conflict')
        return
      }

      user = emailUser
        ? await prisma.user.update({
            where: { id: emailUser.id },
            data: { googleSub: identity.subject },
            select: { id: true, email: true },
          })
        : await prisma.user.create({
            data: {
              id: randomUUID(),
              email: identity.email,
              googleSub: identity.subject,
            },
            select: { id: true, email: true },
          })
    }
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      redirectWithAuthResult(response, 'google_account_conflict')
      return
    }
    throw error
  }

  await createSession(user, request, response)
  redirectWithAuthResult(response, 'success')
})

router.post(
  '/refresh',
  authRateLimit,
  requireTrustedOrigin,
  async (request, response) => {
    const cookie = readRefreshCookie(request)
    if (!cookie) {
      clearAccessCookie(response)
      clearRefreshCookie(response)
      response.status(401).json({ error: { code: 'invalid_refresh_session' } })
      return
    }

    const session = await prisma.authSession.findUnique({
      where: { id: cookie.sessionId },
      include: { user: { select: { id: true, email: true } } },
    })
    const suppliedHash = hashRefreshSecret(cookie.secret)

    if (!session || !isSameHash(suppliedHash, session.refreshTokenHash)) {
      if (session && !session.revokedAt) {
        await prisma.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
      clearAccessCookie(response)
      clearRefreshCookie(response)
      response.status(401).json({ error: { code: 'invalid_refresh_session' } })
      return
    }

    const now = new Date()
    if (session.revokedAt || session.expiresAt <= now) {
      clearAccessCookie(response)
      clearRefreshCookie(response)
      response.status(401).json({ error: { code: 'invalid_refresh_session' } })
      return
    }

    const nextSecret = generateRefreshSecret()
    const expiresAt = new Date(now.getTime() + refreshLifetimeMs)
    const rotation = await prisma.authSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: session.refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        refreshTokenHash: hashRefreshSecret(nextSecret),
        lastUsedAt: now,
        expiresAt,
      },
    })

    if (rotation.count !== 1) {
      clearAccessCookie(response)
      clearRefreshCookie(response)
      response.status(401).json({ error: { code: 'invalid_refresh_session' } })
      return
    }

    setAccessCookie(
      response,
      await createAccessToken(session.user.id, session.id),
    )
    setRefreshCookie(response, session.id, nextSecret, expiresAt)
    response.json({
      data: {
        user: session.user,
        session: { id: session.id, expiresAt: expiresAt.toISOString() },
      },
    })
  },
)

router.post('/logout', requireTrustedOrigin, async (request, response) => {
  const cookie = readRefreshCookie(request)
  if (cookie) {
    await prisma.authSession.updateMany({
      where: {
        id: cookie.sessionId,
        refreshTokenHash: hashRefreshSecret(cookie.secret),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    })
  }

  clearAccessCookie(response)
  clearRefreshCookie(response)
  response.status(204).end()
})

router.get('/me', requireAuthentication, async (request, response) => {
  const userId = request.auth!.sub
  const sessionId = request.auth!.sid
  const session = await prisma.authSession.findFirst({
    where: {
      id: sessionId,
      userId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: { select: { id: true, email: true, createdAt: true } } },
  })

  if (!session) {
    response.status(401).json({ error: { code: 'invalid_access_session' } })
    return
  }

  response.json({
    data: {
      user: {
        ...session.user,
        createdAt: session.user.createdAt.toISOString(),
      },
      session: {
        id: session.id,
        createdAt: session.createdAt.toISOString(),
        lastUsedAt: session.lastUsedAt.toISOString(),
        expiresAt: session.expiresAt.toISOString(),
      },
    },
  })
})

router.post(
  '/logout-all',
  requireTrustedOrigin,
  requireAuthentication,
  async (request, response) => {
    await prisma.authSession.updateMany({
      where: { userId: request.auth!.sub, revokedAt: null },
      data: { revokedAt: new Date() },
    })
    clearAccessCookie(response)
    clearRefreshCookie(response)
    response.status(204).end()
  },
)

export default router

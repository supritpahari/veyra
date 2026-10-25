import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken, type AccessTokenClaims } from './auth-crypto.js'
import { prisma } from './db.js'

declare global {
  namespace Express {
    interface Request {
      auth?: AccessTokenClaims
    }
  }
}

function readAccessCookie(request: Request): string | null {
  const cookieHeader = request.get('cookie')
  if (!cookieHeader) return null
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('veyra_access='))
  return cookie ? cookie.slice('veyra_access='.length) : null
}

export async function requireAuthentication(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const token = readAccessCookie(request)
  if (!token) {
    response.status(401).json({ error: { code: 'authentication_required' } })
    return
  }

  try {
    request.auth = await verifyAccessToken(token)
  } catch {
    response.status(401).json({ error: { code: 'invalid_access_token' } })
    return
  }

  const session = await prisma.authSession.findFirst({
    where: {
      id: request.auth.sid,
      userId: request.auth.sub,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  })
  if (!session) {
    response.status(401).json({ error: { code: 'invalid_access_session' } })
    return
  }

  next()
}

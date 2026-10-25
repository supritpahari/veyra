import cors from 'cors'
import express, { type ErrorRequestHandler } from 'express'
import { corsOrigins } from './config.js'
import { prisma } from './db.js'
import authRouter from './auth.js'
import reportsRouter from './reports.js'

export const app = express()

app.disable('x-powered-by')
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('Origin is not allowed by CORS'))
    },
  }),
)
app.use(express.json({ limit: '1mb' }))

app.use('/api/v1/auth', authRouter)

app.get('/api/health', async (_request, response) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    response.json({ data: { status: 'ok', database: 'connected' } })
  } catch (error) {
    console.error('Health check database query failed:', error)
    response
      .status(503)
      .json({ data: { status: 'unavailable', database: 'disconnected' } })
  }
})

app.use('/api/v1/reports', reportsRouter)

app.use((_request, response) => {
  response.status(404).json({ error: { code: 'route_not_found' } })
})

const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    response.status(400).json({ error: { code: 'invalid_json' } })
    return
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  ) {
    response.status(413).json({
      error: {
        code: request.path === '/api/v1/reports/extract'
          ? 'pdf_too_large'
          : 'request_body_too_large',
      },
    })
    return
  }

  if (error instanceof Error && error.message === 'Origin is not allowed by CORS') {
    response.status(403).json({ error: { code: 'origin_not_allowed' } })
    return
  }

  console.error('Unhandled API error:', error)
  response.status(500).json({ error: { code: 'internal_server_error' } })
}

app.use(errorHandler)

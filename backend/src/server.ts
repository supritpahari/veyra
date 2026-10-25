import { app } from './app.js'
import { config } from './config.js'
import { prisma } from './db.js'

try {
  await prisma.$connect()
  const server = app.listen(config.PORT, () => {
    console.info(`Veyra API listening on http://localhost:${config.PORT}`)
  })

  const shutdown = () => {
    server.close((error) => {
      if (error) {
        console.error('HTTP server shutdown failed:', error)
        process.exitCode = 1
      }
      void prisma.$disconnect()
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
} catch (error) {
  console.error(
    'Unable to connect to MySQL. Verify DATABASE_URL and ensure the veyra database exists.',
    error,
  )
  process.exitCode = 1
}

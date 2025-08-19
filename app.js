const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const port = process.env.PORT || 3000

// Create Next.js app instance
const app = next({ dev })
const handle = app.getRequestHandler()

console.log('Starting Next.js application...')

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true)
    handle(req, res, parsedUrl)
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Medical AI Expert app ready on port ${port}`)
    console.log(`> Environment: ${dev ? 'development' : 'production'}`)
  })
}).catch((err) => {
  console.error('Error starting server:', err)
  process.exit(1)
})

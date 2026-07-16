import express from 'express'
import { createServer } from 'node:http'
import { ExpressPeerServer } from 'peer'

const app = express()
const server = createServer(app)
const port = Number(process.env.PORT ?? 9000)

app.set('trust proxy', true)

app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*')
  response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (request.method === 'OPTIONS') {
    response.sendStatus(204)
    return
  }

  next()
})

app.get('/health', (_request, response) => {
  response.status(200).json({
    status: 'ok',
    service: 'idea-battle-peer-server',
  })
})

const peerServer = ExpressPeerServer(server, {
  path: '/',
  proxied: true,
  allow_discovery: false,
})

app.use('/peerjs', peerServer)

server.listen(port, '0.0.0.0', () => {
  console.log(`PeerServer listening on ${port}`)
})

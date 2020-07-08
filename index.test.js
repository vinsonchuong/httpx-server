import test from 'ava'
import * as httpx from './index.js'
import makeCert from 'make-cert'
import got from 'got'
import WebSocket from 'ws'

test('responding to both http and https requests', async (t) => {
  const {key, cert} = makeCert('localhost')
  const server = httpx.createServer({key, cert}, (request, response) => {
    response.end('Hello World!')
  })

  const wsServer = new WebSocket.Server({server: server.http})
  wsServer.on('connection', (ws) => {
    ws.send('Hello World!')
  })

  const wssServer = new WebSocket.Server({server: server.http2})
  wssServer.on('connection', (ws) => {
    ws.send('Hello World!')
  })

  await new Promise((resolve) => {
    server.net.listen(10000, resolve)
  })

  {
    const response = await got('http://localhost:10000')
    t.is(response.body, 'Hello World!')
  }

  {
    const response = await got('https://localhost:10000', {
      https: {rejectUnauthorized: false}
    })
    t.is(response.body, 'Hello World!')
  }

  {
    const ws = new WebSocket('ws://localhost:10000')
    const message = await new Promise((resolve) => {
      ws.once('message', resolve)
    })
    t.is(message, 'Hello World!')
  }

  {
    const ws = new WebSocket('wss://localhost:10000', {
      rejectUnauthorized: false
    })
    const message = await new Promise((resolve) => {
      ws.once('message', resolve)
    })
    t.is(message, 'Hello World!')
  }
})

import test from 'ava'
import * as http2 from 'http2'
import * as httpx from './index.js'
import makeCert from 'make-cert'
import got from 'got'
import WebSocket from 'ws'
import getStream from 'get-stream'

test('responding to both http and https requests', async (t) => {
  const {key, cert} = makeCert('localhost')
  const server = httpx.createServer({key, cert}, (request, response) => {
    response.end('Hello World!')
  })
  t.teardown(() => {
    server.close()
  })

  const wss = new WebSocket.Server({server})
  wss.on('connection', (ws) => {
    ws.send('Hello World!')
  })

  await new Promise((resolve) => {
    server.listen(10000, resolve)
  })

  t.like(await got('http://localhost:10000'), {body: 'Hello World!'})

  {
    const client = http2.connect('http://localhost:10000')
    t.teardown(() => client.close())

    const request = client.request({':path': '/'})
    t.teardown(() => request.end())
    t.is(await getStream(request), 'Hello World!')
  }

  t.like(
    await got('https://localhost:10000', {
      https: {rejectUnauthorized: false}
    }),
    {body: 'Hello World!'}
  )

  t.like(
    await got('https://localhost:10000', {
      http2: true,
      https: {rejectUnauthorized: false}
    }),
    {body: 'Hello World!'}
  )

  {
    const ws = new WebSocket('ws://localhost:10000')
    t.teardown(() => {
      ws.close()
    })

    const message = await new Promise((resolve) => {
      ws.once('message', resolve)
    })
    t.is(message, 'Hello World!')
    ws.close()
  }

  {
    const ws = new WebSocket('wss://localhost:10000', {
      rejectUnauthorized: false
    })
    t.teardown(() => {
      ws.close()
    })

    const message = await new Promise((resolve) => {
      ws.once('message', resolve)
    })
    t.is(message, 'Hello World!')
  }
})

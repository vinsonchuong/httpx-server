import * as http2 from 'node:http2'
import test from 'ava'
import makeCert from 'make-cert'
import got from 'got'
import WebSocket from 'ws'
import getStream from 'get-stream'
import * as httpx from './index.js'

test('responding to both http and https requests', async (t) => {
  const {key, cert} = makeCert('localhost')
  const server = httpx.createServer({key, cert}, (request, response) => {
    response.end('Hello World!')
  })

  await new Promise((resolve) => {
    server.listen(10_000, resolve)
  })
  t.teardown(() => {
    server.close()
  })

  const wss = new WebSocket.Server({server})
  wss.on('connection', (ws) => {
    ws.send('Hello World!')
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

test('optionally skipping TLS', async (t) => {
  const server = httpx.createServer((request, response) => {
    response.end('Hello World!')
  })

  await new Promise((resolve) => {
    server.listen(10_001, resolve)
  })
  t.teardown(() => {
    server.close()
  })

  t.like(await got('http://localhost:10001'), {body: 'Hello World!'})

  {
    const client = http2.connect('http://localhost:10001')
    t.teardown(() => client.close())

    const request = client.request({':path': '/'})
    t.teardown(() => request.end())
    t.is(await getStream(request), 'Hello World!')
  }
})

test('supporting server push', async (t) => {
  const {HTTP2_HEADER_METHOD, HTTP2_HEADER_PATH} = http2.constants

  const server = httpx.createServer((request, response) => {
    response.createPushResponse(
      {
        [HTTP2_HEADER_METHOD]: 'GET',
        [HTTP2_HEADER_PATH]: '/one'
      },
      (error, response) => {
        response.writeHead(200, {})
        response.end('Push for /one')
      }
    )

    response.end('Hello World!')
  })

  await new Promise((resolve) => {
    server.listen(10_002, resolve)
  })
  t.teardown(() => {
    server.close()
  })

  const client = http2.connect('http://localhost:10002')
  t.teardown(() => client.close())

  await new Promise((resolve) => {
    client.on('stream', async (stream, headers) => {
      t.is(headers[HTTP2_HEADER_PATH], '/one')
      t.is(await getStream(stream), 'Push for /one')
      resolve()
    })

    const request = client.request({':path': '/'})
    t.teardown(() => request.end())
  })
})

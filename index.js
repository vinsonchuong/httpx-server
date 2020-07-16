import * as net from 'net'
import * as http from 'http'
import * as http2 from 'http2'

// eslint-disable-next-line node/no-deprecated-api
import JSStreamSocket from '_stream_wrap'

const httpServerEvents = new Set([
  'checkContinue',
  'checkExpectation',
  'clientError',
  'connect',
  'request',
  'upgrade',
  'session',
  'sessionError',
  'stream',
  'timeout',
  'unknownProtocol'
])

export class Server extends net.Server {
  constructor(options, requestListener) {
    super((socket) => {
      socket.once('data', async (buffer) => {
        socket.pause()
        socket.unshift(buffer)

        if (buffer[0] === 22) {
          this.http2.emit('connection', socket)
        } else {
          socket.resume()
          if (buffer.includes('HTTP/1.1')) {
            this.http.emit('connection', socket)
          } else if (buffer.includes('HTTP/2.0')) {
            this.http2c.emit('connection', new JSStreamSocket(socket))
          }
        }
      })
    })

    this.http = http.createServer(options, requestListener)
    this.http2c = http2.createServer(options, requestListener)
    this.http2 = http2.createSecureServer(
      {...options, allowHTTP1: true},
      requestListener
    )

    this.on('newListener', (eventName, listener) => {
      if (httpServerEvents.has(eventName)) {
        this.http.on(eventName, listener)
        this.http2c.on(eventName, listener)
        this.http2.on(eventName, listener)
      }
    })
    this.on('removeListener', (eventName, listener) => {
      if (httpServerEvents.has(eventName)) {
        this.http.off(eventName, listener)
        this.http2c.off(eventName, listener)
        this.http2.off(eventName, listener)
      }
    })
  }

  setTimeout(...args) {
    this.http.setTimeout(...args)
    this.http2c.setTimeout(...args)
    this.http2.setTimeout(...args)
  }

  get timeout() {
    return this.http.timeout
  }

  set timeout(value) {
    this.http.timeout = value
    this.http2c.timeout = value
    this.http2.timeout = value
  }
}

export function createServer(options, requestHandler) {
  return new Server(options, requestHandler)
}

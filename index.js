import * as net from 'node:net'
import * as http from 'node:http'
import * as http2 from 'node:http2'

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
  'unknownProtocol',
])

export class Server extends net.Server {
  constructor(...arguments_) {
    const options =
      arguments_[0] && typeof arguments_[0] === 'object' ? arguments_[0] : {}
    const requestListener =
      typeof arguments_[0] === 'function' ? arguments_[0] : arguments_[1]

    const hasCert = (options.cert && options.key) || options.pfx

    super((socket) => {
      socket.once('data', async (buffer) => {
        socket.pause()
        socket.unshift(buffer)

        if (hasCert && buffer[0] === 22) {
          this.http2.emit('connection', socket)
          socket.on('', () => {
            console.log('socket end')
          })
        } else if (buffer.includes('HTTP/2.0')) {
          this.http2c.emit('connection', socket)
        } else {
          socket.resume()
          this.http.emit('connection', socket)
        }
      })
    })

    this.http = http.createServer(options, requestListener)
    this.http2c = http2.createServer(options, requestListener)

    if (hasCert) {
      this.http2 = http2.createSecureServer(
        {...options, allowHTTP1: true},
        requestListener,
      )
    }

    this.on('newListener', (eventName, listener) => {
      if (httpServerEvents.has(eventName)) {
        this.http.on(eventName, listener)
        this.http2c.on(eventName, listener)
        this.http2?.on(eventName, listener)
      }
    })

    this.on('removeListener', (eventName, listener) => {
      if (httpServerEvents.has(eventName)) {
        this.http.off(eventName, listener)
        this.http2c.off(eventName, listener)
        this.http2?.off(eventName, listener)
      }
    })
  }

  setTimeout(...arguments_) {
    this.http.setTimeout(...arguments_)
    this.http2c.setTimeout(...arguments_)
    this.http2?.setTimeout(...arguments_)
  }

  get timeout() {
    return this.http.timeout
  }

  set timeout(value) {
    this.http.timeout = value
    this.http2c.timeout = value
    if (this.http2) {
      this.http2.timeout = value
    }
  }

  close() {
    super.close()
    this.http?.close()
    this.http2c?.close()
    this.http2?.close()
  }
}

export function createServer(options, requestHandler) {
  return new Server(options, requestHandler)
}

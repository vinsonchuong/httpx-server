import * as net from 'net'
import * as http from 'http'
import * as http2 from 'http2'

export function createServer(options, handler) {
  const httpServer = http.createServer(handler)
  const http2Server = http2.createSecureServer(
    {...options, allowHTTP1: true},
    handler
  )

  const server = net.createServer((socket) => {
    socket.once('data', (buffer) => {
      socket.pause()
      socket.unshift(buffer)

      const firstByte = buffer[0]
      if (firstByte === 22) {
        http2Server.emit('connection', socket)
      } else if (firstByte > 32 && firstByte < 127) {
        httpServer.emit('connection', socket)
      }

      process.nextTick(() => socket.resume())
    })
  })

  return {
    net: server,
    http: httpServer,
    http2: http2Server
  }
}

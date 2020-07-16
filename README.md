# httpx-server
[![npm](https://img.shields.io/npm/v/httpx-server.svg)](https://www.npmjs.com/package/httpx-server)
[![CI Status](https://github.com/vinsonchuong/httpx-server/workflows/CI/badge.svg)](https://github.com/vinsonchuong/httpx-server/actions?query=workflow%3ACI)
[![dependencies Status](https://david-dm.org/vinsonchuong/httpx-server/status.svg)](https://david-dm.org/vinsonchuong/httpx-server)
[![devDependencies Status](https://david-dm.org/vinsonchuong/httpx-server/dev-status.svg)](https://david-dm.org/vinsonchuong/httpx-server?type=dev)

Respond to encrypted and unencrypted HTTP/1.1 and HTTP/2 requests on the same port

## Usage
Install [httpx-server](https://www.npmjs.com/package/httpx-server)
by running:

```sh
yarn add httpx-server
```

Start a server like so:

```js
import * as httpx from 'httpx-server'

const server = httpx.createServer(
  { key, cert },
  (request, response) => {
    response.end('Hello World!')
  }
)

server.listen(8080)
```

This starts a
[`net.Server`](https://nodejs.org/api/net.html#net_class_net_server), that
examines the first byte of each request. If the first byte is 22 (0x16), we
know that the client is
[negotiating a TLS connection](https://tls.ulfheim.net/), which we then route
to an
[HTTP/2 server](https://nodejs.org/api/http2.html#http2_class_http2secureserver)
that can handle both HTTP/1.1 and HTTP/2 requests over TLS. Otherwise, if the
request includes the text `HTTP/1.1`, it is routed to an
[HTTP/1.1 server](https://nodejs.org/api/http.html#http_http_createserver_options_requestlistener).
And, if the request includes the text `HTTP/2`, it is routed to a
[clear text HTTP/2 server](https://nodejs.org/api/http2.html#http2_class_http2server).

The code for differentiating between unencrypted HTTP/1.1 and HTTP/2 requests
relies on currently deprecated code. There's an [outstanding issue to undeprecate
that code](https://github.com/nodejs/node/issues/34296).

Upgrading from unencrypted HTTP/1.1 to HTTP/2 via the `Upgrade` header is not
supported.

The returned `server` object behaves like an
[`http.Server`](https://nodejs.org/docs/latest/api/http.html#http_class_http_server)
or
[`http2.Http2Server`](https://nodejs.org/api/http2.html#http2_class_http2server)
or
[`http2.Http2SecureServer`](https://nodejs.org/docs/latest/api/http2.html#http2_class_http2secureserver).
Properties, methods, and events common to both are implemented on this object.
In other words, binding an event listener to this object binds event listeners
to both the HTTP/1.1 and HTTP/2 server objects.

Requests are routed from `net.Server` to `http.Server` or `http2.Http2Server`
or `http2.Http2SecureServer` using the
[`connection` event](https://nodejs.org/api/http.html#http_event_connection).

WebSocket is supported, both encrypted and unencrypted. `ws` has a
[usage example](https://github.com/websockets/ws#external-https-server) that
works with the `server` object returned by `httpx.createServer`.

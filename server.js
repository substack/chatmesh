var JSONStream = require('JSONStream')
var wsock = require('websocket-stream')
var http = require('http')
var minimist = require('minimist')
var fs = require('fs')
var pump = require('pump')
var to = require('to2')

var Mesh = require('./mesh')
var Swarm = require('./swarm')

var argv = minimist(process.argv.slice(2))
var server = http.createServer(function (req, res) {
  if (req.url === '/bundle.js') {
    res.setHeader('Content-Type', 'text/html')
    return fs.createReadStream('bundle.js').pipe(res)
  }
  if (req.url !== '/replicate') {
    res.setHeader('Content-Type', 'text/html')
    res.statusCode = 200
    return fs.createReadStream('index.html').pipe(res)
  }

  res.statusCode = 404
  res.end('not found')
})

  wsock.createServer({ server , perMessageDeflate: false }, function (socket, req) {
    if (req.url.match(/replicate/)) {
      try {
        // TODO: use dat-encoding lib
        var addr =  req.url.split('replicate')[1].substring(1)
      } catch (err) {
        return socket.destroy('Invalid dat address')
      }
      var mesh = Mesh(`${argv.d}/${addr}`, 'dat://' + addr, {username: argv.u || 'bot'})

      mesh.db.ready(function (err) {
        var src = mesh.replicate()
        Swarm(mesh)

        pump(src, socket, src, function (err) {
          if (err) console.log('REPLICATION ERROR:', err)
          else console.log('REPLICATION: done')
        })
      })
    } else socket.destroy(req.url + ' does not match')
  })


server.listen(8080, function () {
  console.log('localhost:8080')
})

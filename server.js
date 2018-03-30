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
var mesh = Mesh(argv.d, argv._[0], {username: argv.u || 'bot'})

mesh.db.ready(function (err) {
  var db = mesh.db
  var server = http.createServer(function (req, res) {
    if (req.url === '/bundle.js') {
      res.setHeader('Content-Type', 'text/html')
      return fs.createReadStream('bundle.js').pipe(res)
    }
    if (req.url.match(/history/)) {
      res.setHeader('Content-Type', 'application/json')
      return pump(db.createHistoryStream(), JSONStream.stringify(), res)
    }
    if (req.url !== '/replicate') {
      res.setHeader('Content-Type', 'text/html')
      res.statusCode = 200
      return fs.createReadStream('index.html').pipe(res)
    }

    res.statusCode = 404
    res.end('not found')
  })

  Swarm(mesh)

  wsock.createServer({ server: server , perMessageDeflate: false }, function (socket, req) {
    if (req.url === '/replicate') {
      var src = mesh.replicate()
      pump(src, socket, src, function (err) {
        if (err) console.log('REPLICATION ERROR:', err)
        else console.log('REPLICATION: done')
      })
    }
    else stream.destroy(req.url + ' does not match')
  })


  server.listen(8080, function () {
    console.log('localhost:8080')
  })
})

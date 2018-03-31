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
if (!argv._[0]) return console.error('Key required.')
var mesh = Mesh(argv.d, argv._[0], {username: argv.u || 'bot'})

mesh.db.ready(function (err) {
  var db = mesh.db
  Swarm(mesh)
})

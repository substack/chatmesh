var websocket = require('websocket-stream')
var ram = require('random-access-memory')
var to = require('to2')
var pump = require('pump')

var Mesh = require('./mesh')

var addr = window.location.pathname.split('/')[1]
var seen = {}

console.log('creating mesh for', addr)
var mesh = Mesh(function () { return ram() } , 'dat://' + addr, {username: 'web-client', sparse: true})

mesh.db.ready(function () {
  var ws = websocket(`ws://localhost:8080/replicate/${addr}`, {
    perMessageDeflate: false
  })
  ws.on('connection', function () {
    console.log('data', arguments)
  })

  console.log('replicating')
  var src = mesh.replicate()
  pump(src, ws, src, function (err) {
    if (err) return console.error(err)
    console.log('done replicating')
  })

  var messages = document.querySelector('.messages')
  pump(mesh.db.createHistoryStream(), to.obj(
    function (row, enc, next) {
      writeMsg(row)
      next()
    },
    function (next) {
      mesh.db.on('remote-update', onappend)
      mesh.db.on('append', onappend)
      function onappend (feed) {
        var h = mesh.db.createHistoryStream({ reverse: true })
        pump(h, to.obj(function (row, enc, next) {
          writeMsg(row)
          h.destroy()
        }))
        var src = mesh.replicate()
      }
      next()
    }
  ), function (err) {
    if (err) console.error(err)
  })

  function addLine (message) {
    var msg = document.createElement('div')
    msg.innerHTML = message
    messages.appendChild(msg)
  }

  mesh.on('join', function (username) {
    addLine(`${username} joined the channel`)
  })

  mesh.on('leave', function (username) {
    addLine(`${username} left the channel`)
  })

  function writeMsg (row) {
    if (seen[row.key]) return
    seen[row.key] = true
    if (row.value && (m=/^chat\/([^\/]+)@/.exec(row.key))) {
      addLine(`${m[1]}: ${row.value.username}: ${row.value.message}`)
    }
  }

  var ENTER = 13

  var input = document.querySelector('#input')
  input.addEventListener('keypress', function (event) {
    if (event.keyCode === ENTER) {
      console.log('adding event', event.target.value)
      mesh.message(event.target.value, function (err) {
        if (err) console.error(err)
        event.target.value = ''
      })
    }
  })

})

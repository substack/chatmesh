var catnames = require('cat-names')
var to = require('to2')
var pump = require('pump')
var strftime = require('strftime')
var chatmesh = require('chatmesh-db')
var swarm = require('chatmesh-db/swarm')
var neatLog = require('neat-log')
var output = require('neat-log/output')

module.exports = function (argv) {
  var seen = {}
  var _tzoffset = new Date().getTimezoneOffset()*60*1000
  var username = argv.u || catnames.random()
  var neat = neatLog(view, {fullscreen: true, showCursor: true})
  var mesh = chatmesh(argv.d || '/tmp/chat', argv._[0], {username: username, sparse: true})

  neat.use(function (state, bus) {
    state.messages = []
    neat.input.on('update', () => neat.render())
    neat.input.on('enter', (line) => {
      mesh.message(line, function (err) {
        if (err) console.log(err)
      })
    })
  })

  neat.use(function (state, bus) {
    mesh.db.ready(function (err) {
      if (err) exit(err)
      var db = mesh.db
      state.dbLoaded = true
      state.key = 'dat://' + db.key.toString('hex')
      swarm(mesh)
      bus.emit('render')

      mesh.on('join', function (username) {
        state.messages.push(`${username} joined the mesh.`)
        bus.emit('render')
      })
      mesh.on('leave', function (username) {
        state.messages.push(`${username} left the mesh.`)
        bus.emit('render')
      })

      pump(db.createHistoryStream(), to.obj(
        function (row, enc, next) {
          writeMsg(row)
          next()
        },
        function (next) {
          db.on('remote-update', onappend)
          db.on('append', onappend)
          function onappend (feed) {
            var h = db.createHistoryStream({ reverse: true })
            pump(h, to.obj(function (row, enc, next) {
              writeMsg(row)
              h.destroy()
            }))
          }
          next()
        }
      ), function (err) {
        if (err) console.error(err)
      })
    })

    function writeMsg (row) {
      if (seen[row.key]) return
      seen[row.key] = true
      var m
      if (row.value && (m=/^chat\/([^\/]+)@/.exec(row.key))) {
        var utcDate = new Date(m[1])
        state.messages.push(`[${strftime('%T', new Date(utcDate-_tzoffset))}] <${row.value.username}> ${row.value.message}`)
        bus.emit('render')
      }
    }
  })

  function view (state) {
    if (!state.dbLoaded) {
      return output(`
        chatMESH

        ... loading
      `)
    }
    var rows = process.stdout.rows - 6
    var msgs = state.messages
    if (rows >= msgs.length) {
      msgs = msgs.concat(Array(rows - msgs.length).fill())
    } else {
      msgs = msgs.slice(msgs.length - rows, msgs.length)
    }

    return output(`
      chatMESH
      Room: ${state.key}

      ${msgs.map((row) => {
        if (!row) return ''
        return `${row}`
      }).join('\n')}
      ${Array(process.stdout.columns).fill().join('_')}
      ${username} >${neat.input.line()}
    `)
  }

  function exit (err) {
    if (err) console.trace(err)
    process.exit()
  }
}

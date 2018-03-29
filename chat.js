var minimist = require('minimist')
var argv = minimist(process.argv.slice(2))

var catnames = require('cat-names')
var split = require('split2')
var to = require('to2')
var pump = require('pump')

var strftime = require('strftime')
var randomBytes = require('crypto').randomBytes
var diff = require('ansi-diff')({
  width: process.stdout.columns,
  height: process.stdout.rows
})
process.stdout.write('\x1b[2J')
var screen = require('./screen.js')({
  columns: process.stdout.columns,
  rows: process.stdout.rows
})
process.stdout.on('resize', function () {
  process.stdout.write('\x1b[2J')
  diff.resize({
    width: process.stdout.columns,
    height: process.stdout.rows
  })
  screen.setSize(process.stdout.columns, process.stdout.rows)
  render()
})
function render () {
  process.stdout.write(diff.update(screen.render(), {
    moveTo: [screen.cursor+11,screen.rows-2]
  }))
}
var codes = [
  { code: Buffer.from([0x03]), name: '^C' },
  { code: Buffer.from([0x04]), name: '^D' },
  { code: Buffer.from([0x1b,0x5b,0x48]), name: 'home' },
  { code: Buffer.from([0x1b,0x5b,0x46]), name: 'end' },
  { code: Buffer.from([0x1b,0x5b,0x44]), name: 'left' },
  { code: Buffer.from([0x1b,0x5b,0x43]), name: 'right' },
  { code: Buffer.from([0x1b,0x5b,0x41]), name: 'up' },
  { code: Buffer.from([0x1b,0x5b,0x42]), name: 'down' },
  { code: Buffer.from([0x1b,0x5b,0x33,0x7e]), name: 'delete' },
  { code: Buffer.from([0x7f]), name: 'backspace' }
]
var username

open(argv._[0], argv.d, function (err, addr, db) {
  if (!argv._[0]) {
    var d = new Date
    var utcDate = new Date(d.valueOf() + d.getTimezoneOffset()*60*1000)
    screen.addLine(utcDate, {message: 'dat://' + db.key.toString('hex')}, '')
    render()
  }
  setInterval(render, 1000)

  username = argv.u || catnames.random()

  var seen = {}
  pump(db.createHistoryStream(), to.obj(
    function (row, enc, next) {
      writeMsg(row, enc, next)
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
  ))
  function writeMsg (row) {
    if (seen[row.key]) return
    seen[row.key] = true
    var m
    if (row.value && (m=/^chat\/([^\/]+)@/.exec(row.key))) {
      screen.addLine(new Date(m[1]), row.value, row.key)
      render()
    }
  }
  require('./swarm.js')(addr, db)

  process.stdin.setRawMode(true)
  var line = ''
  var buffers = []
  pump(process.stdin, to(write))
  function write (buf, enc, next) {
    for (var i = 0; i < codes.length; i++) {
      if (!codes[i].code.equals(buf)) continue
      var name = codes[i].name
      if (name === '^C') return exit()
      if (name === 'backspace') {
        if (screen.cursor > 0) buffers.splice(screen.cursor-1,1)
        screen.cursor = Math.max(0,screen.cursor-1)
        screen.setInput(Buffer.concat(buffers).toString())
        render()
      }
      if (name === 'delete') {
        buffers.splice(screen.cursor,1)
        //screen.cursor = Math.max(0,screen.cursor+1)
        screen.setInput(Buffer.concat(buffers).toString())
        render()
      }
      if (name === 'left') {
        screen.cursor = Math.max(0,screen.cursor-1)
        render()
      }
      if (name === 'right') {
        screen.cursor = Math.max(0,screen.cursor+1)
        render()
      }
      if (name === 'home') {
        screen.cursor = 0
        render()
      }
      if (name === 'end') {
        screen.cursor = screen._input.length
        render()
      }
      return next()
    }
    if (buf[0] !== 0x0d) {
      buffers.splice(screen.cursor,0,buf)
      screen.setInput(Buffer.concat(buffers).toString())
      screen.cursor++
      render()
      return next()
    }
    var message = Buffer.concat(buffers).toString()
    buffers = []
    screen.setInput('')
    screen.cursor = 0
    render()
    var d = new Date
    var utcDate = new Date(d.valueOf() + d.getTimezoneOffset()*60*1000)
    var now = strftime('%F %T', utcDate)
    var key = 'chat/' + now + '@' + randomBytes(8).toString('hex')
    db.put(key, {username, message}, function (err) {
      if (err) console.log(err)
      else next()
    })
  }
})

function open (href, dbdir, cb) {
  var hyperdb = require('hyperdb')
  var addr = /^dat:/.test(href)
    ? Buffer(href.replace(/^dat:\/*/,''),'hex') : null
  var db = addr
    ? hyperdb(dbdir, addr, { sparse: true, valueEncoding: 'json' })
    : hyperdb(dbdir, { sparse: true, valueEncoding: 'json' })
  db.ready(function () {
    cb(null, addr || db.key, db)
  })
}

function exit () { process.exit() }

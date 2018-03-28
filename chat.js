var minimist = require('minimist')
var argv = minimist(process.argv.slice(2))

var split = require('split2')
var to = require('to2')
var pump = require('pump')

var hyperdb = require('hyperdb')
var addr = /^dat:/.test(argv._[0])
  ? Buffer(argv._[0].replace(/^dat:\/*/,''),'hex')
  : null
if (addr) {
  var db = hyperdb(argv.d, addr, { valueEncoding: 'utf8' })
} else {
  var db = hyperdb(argv.d, { valueEncoding: 'utf8' })
}
db.ready(function () {
  if (!addr) {
    addr = db.key
    console.log('dat://' + addr.toString('hex'))
  }
  onready()
})

function onready () {
  pump(db.createHistoryStream(), to.obj(function (row, enc, next) {
    if (row.value) console.log(row.key, row.value)
    next()
  }))
  db.on('append', function (node) {
    pump(db.createHistoryStream({ reverse: true }), to.obj(function (row, enc, next) {
      if (row.value) console.log(row.key, row.value)
    }))
  })

  var discovery = require('discovery-swarm')
  var swarmDefaults = require('datland-swarm-defaults')
  console.log('ID',db.local.key)
  var sw = discovery(swarmDefaults({
    id: db.local.key,
    stream: function (peer) {
      var s = db.replicate({
        live: true,
        userData: db.local.key
      })
      s.on('error', console.log)
      return s
    }
  }))
  sw.join(addr.toString('hex'))
  sw.on('connection', function (peer) {
    if (!peer.remoteUserData) return
    db.authorized(peer.remoteUserData, function (err, auth) {
      if (err) return console.log(err)
      //console.log('authorized?', auth, peer.remoteUserData.toString('hex'))
      if (!auth) db.authorize(peer.remoteUserData, function (err) {
        if (err) return console.log(err)
      })
    })
  })
}

var strftime = require('strftime')
var randomBytes = require('crypto').randomBytes

pump(process.stdin, split(), to(write))
function write (buf, enc, next) {
  var line = buf.toString()
  var now = Date.now()/1000
  var frac = now - Math.floor(now)
  var now = strftime('%F-%T.' + frac)
  var key = 'chat/' + now + '-' + randomBytes(8).toString('hex')
  db.put(key, line, function (err) {
    if (err) console.log(err)
    else next()
  })
}

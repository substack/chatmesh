var minimist = require('minimist')
var argv = minimist(process.argv.slice(2))

var split = require('split2')
var to = require('to2')
var pump = require('pump')

var strftime = require('strftime')
var randomBytes = require('crypto').randomBytes

open(argv._[0], argv.d, function (err, addr, db) {
  if (!argv._[0]) console.log('dat://' + db.key.toString('hex'))

  pump(db.createHistoryStream(), to.obj(function (row, enc, next) {
    if (row.value) console.log(row.key, row.value)
    next()
  }))
  db.on('append', function (node) {
    pump(db.createHistoryStream({ reverse: true }), to.obj(function (row, enc, next) {
      if (row.value) console.log(row.key, row.value)
    }))
  })
  require('./swarm.js')(addr, db)

  pump(process.stdin, split(), to(write))
  function write (buf, enc, next) {
    var line = buf.toString()
    var d = new Date
    var utcDate = new Date(d.valueOf() + d.getTimezoneOffset()*60*1000)
    var now = strftime('%F-%T', utcDate).replace(/:/g,'_')
    var key = 'chat/' + now + '-' + randomBytes(8).toString('hex')
    db.put(key, line, function (err) {
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
    ? hyperdb(dbdir, addr, { valueEncoding: 'utf8' })
    : hyperdb(dbdir, { valueEncoding: 'utf8' })
  db.ready(function () {
    cb(null, addr || db.key, db)
  })
}

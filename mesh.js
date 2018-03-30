var hyperdb = require('hyperdb')
var strftime = require('strftime')
var randomBytes = require('crypto').randomBytes
var events = require('events')
var inherits = require('inherits')

module.exports =  Mesh

function Mesh (storage, href, opts) {
  if (!(this instanceof Mesh)) return new Mesh(storage, href, opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)
  var self = this

  var json = {
    encode: function (obj) {
      return Buffer.from(JSON.stringify(obj))
    },
    decode: function (buf) {
      var str = buf.toString('utf8')
      try { var obj = JSON.parse(str) }
      catch (err) { return {} }
      return obj
    }
  }

  self.username = opts.username || 'anonymous'

  self.addr = /^dat:/.test(href)
    ? Buffer(href.replace(/^dat:\/*/,''),'hex') : null
  self.db = self.addr
    ? hyperdb(storage, self.addr, {valueEncoding: json})
    : hyperdb(storage, {valueEncoding: json})

  self.users = {}
  self.users[opts.username] = new Date()
}

inherits(Mesh, events.EventEmitter)

Mesh.prototype.onconnection = function (peer) {
  var self = this
  if (!peer.remoteUserData) return
  var data = JSON.parse(peer.remoteUserData)
  var key = Buffer.from(data.key)
  var username = data.username

  self.db.authorized(key, function (err, auth) {
    if (err) return console.log(err)
    if (!auth) self.db.authorize(key, function (err) {
      if (err) return console.log(err)
    })
  })

  if (!self.users[username]) {
    self.users[username] = new Date()
    self.emit('join', username)
    peer.on('close', function () {
      if (!self.users[username]) return
      delete self.users[username]
      self.emit('leave', username)
    })
  }
}

Mesh.prototype.message = function (message, opts, done) {
  if (typeof opts === 'function') return this.message(message, null, opts)
  if (!opts) opts = {}
  var self = this
  var d = opts.date || new Date
  var username = opts.username || self.username
  var utcDate = new Date(d.valueOf() + d.getTimezoneOffset()*60*1000)
  var now = strftime('%F %T', utcDate)
  var key = 'chat/' + now + '@' + randomBytes(8).toString('hex')
  self.db.put(key, {username, message}, done)
}

Mesh.prototype.replicate = function () {
  var self = this
  return this.db.replicate({
    live: true,
    userData: JSON.stringify({
      key: self.db.local.key,
      username: self.username
    })
  })
}

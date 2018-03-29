var discovery = require('discovery-swarm')
var swarmDefaults = require('datland-swarm-defaults')
var strftime = require('strftime')
var randomBytes = require('crypto').randomBytes
var events = require('events')
var inherits = require('inherits')

module.exports =  Channel

function Channel (db, addr, opts) {
  if (!(this instanceof Channel)) return new Channel(db, addr, opts)
  if (!opts) opts = {}
  events.EventEmitter.call(this)
  var self = this

  self.username = opts.username || 'anonymous'
  self._addr = addr
  self._db = db
  self.users = {}
  self.users[opts.username] = new Date()
  self.swarm = discovery(swarmDefaults({
    id: db.local.key,
    stream: function (peer) {
      var s = db.replicate({
        live: true,
        userData: JSON.stringify({
          key: db.local.key,
          username: self.username
        })
      })
      return s
    }
  }))
  self.swarm.join(addr.toString('hex'))
  self.swarm.on('connection', self._onconnection.bind(self))
}

inherits(Channel, events.EventEmitter)

Channel.prototype._onconnection = function (peer) {
  var self = this
  if (!peer.remoteUserData) return
  var data = JSON.parse(peer.remoteUserData)
  var key = Buffer.from(data.key)
  var username = data.username
  
  self._db.authorized(key, function (err, auth) {
    if (err) return console.log(err)
    if (!auth) self._db.authorize(key, function (err) {
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

Channel.prototype.message = function (message, opts, done) {
  if (typeof opts === 'function') return this.message(message, null, opts)
  if (!opts) opts = {}
  var self = this
  var d = opts.date || new Date
  var username = opts.username || self.username
  var utcDate = new Date(d.valueOf() + d.getTimezoneOffset()*60*1000)
  var now = strftime('%F %T', utcDate)
  var key = 'chat/' + now + '@' + randomBytes(8).toString('hex')
  self._db.put(key, {username, message}, done)
}

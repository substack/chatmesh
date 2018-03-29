var swarm = require('./swarm')
var strftime = require('strftime')
var randomBytes = require('crypto').randomBytes

module.exports =  Mesh

function Mesh (db, addr, opts) {
  if (!(this instanceof Mesh)) return new Mesh(db, addr, opts)
  if (!opts) opts = {}
  this.username = opts.username || 'anonymous'
  this.swarm = swarm(addr, db)
  this.db = db
}

Mesh.prototype.message = function (text, opts, done) {
  if (typeof opts === 'function') return this.message(text, null, opts)
  if (!opts) opts = {}
  var self = this
  var d = opts.date || new Date
  var utcDate = new Date(d.valueOf() + d.getTimezoneOffset()*60*1000)
  var now = strftime('%F %T', utcDate)
  var key = 'chat/' + now + '@' + randomBytes(8).toString('hex')
  self.db.put(key, {username: self.username, message: text}, done)
}

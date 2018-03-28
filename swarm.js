var discovery = require('discovery-swarm')
var swarmDefaults = require('datland-swarm-defaults')

module.exports = function (addr, db) {
  var sw = discovery(swarmDefaults({
    id: db.local.key,
    stream: function (peer) {
      var s = db.replicate({
        live: true,
        userData: db.local.key
      })
      //s.on('error', console.log)
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

var discovery = require('discovery-swarm')
var swarmDefaults = require('dat-swarm-defaults')

module.exports = function (mesh) {
  var swarm = discovery(swarmDefaults({
    id: mesh.db.local.key,
    stream: function (peer) {
      return mesh.replicate()
    }
  }))
  var key = mesh.addr || mesh.db.key
  swarm.join(key.toString('hex'))
  swarm.on('connection', mesh.onconnection.bind(mesh))
  return swarm
}

var chatmesh = require('chatmesh-db')
var swarm = require('chatmesh-db/swarm')

module.exports = function (argv) {
  if (!argv._[0]) return console.error('Key required.')
  var mesh = chatmesh(argv.d, argv._[0], {username: argv.u || 'bot'})

  mesh.db.ready(function (err) {
    if (err) throw err
    swarm(mesh)
  })
}

var Mesh = require('./mesh')
var Swarm = require('./swarm')

module.exports = function (argv, cb) {
  if (!argv._[0]) return console.error('Key required.')
  var mesh = Mesh(argv.d, argv._[0], {username: argv.u || 'bot'})

  mesh.db.ready(function (err) {
    if (err) throw err
    mesh.swarm = Swarm(mesh)
    cb(mesh)
  })
}

var strftime = require('strftime')
var concatMap = require('concat-map')

module.exports = Screen

function Screen (opts) {
  if (!(this instanceof Screen)) return new Screen(opts)
  this._lines = []
  this._tzoffset = new Date().getTimezoneOffset()*60*1000
  this._input = ''
  this.columns = opts.columns
  this.rows = opts.rows
  this.cursor = 0
}

Screen.prototype.setSize = function (columns, rows) {
  this.columns = columns
  this.rows = rows
}

Screen.prototype.addLine = function (time, row, key) {
  this._lines.push({
    time: time,
    username: row.username,
    message: row.message,
    key: key
  })
}

Screen.prototype.setInput = function (msg) {
  //this.cursor = Math.max(0, this.cursor + (msg.length - this._input.length))
  this._input = msg
}

Screen.prototype.render = function () {
  var self = this
  var lines = self._lines.sort(function (a, b) {
    if (a.time < b.time) return -1
    if (a.time > b.time) return +1
    return a.key < b.key ? -1 : +1
  })
  lines = concatMap(lines, function (line) {
    var msg = line.message
    var parts = []
    var c = self.columns - 12
    for (var j = 0; j < msg.length; j += c) {
      parts.push({
        time: line.time,
        username: line.username,
        message: msg.slice(j,j+c),
        continue: j > 0
      })
    }
    return parts
  })
  var N = this.rows-2
  lines = lines.slice(Math.max(0,lines.length-N+1),lines.length)
  for (var i = lines.length; i < N-1; i++) {
    lines.push({ time: null })
  }
  var last = strftime('[%T] ' + this._input)
  last += Array(self.columns-last.length).fill().join(' ')
  return '' //'\x1b[1G\x1b[1;m'
    + lines.map(function (line) {
      var str = ''
      if (line.continue) {
        str = Array(12).fill().join(' ') + line.message
      } else if (line.time) {
        str = strftime('[%T] ',
          new Date(line.time-self._tzoffset)) + line.username + ': ' + line.message
      }
      str += Array(Math.max(0,self.columns-str.length)).fill().join(' ')
      return str
    }).join('\n') + '\n'
    + Array(self.columns).fill().join('-') + '\n'
    + last
    //+ '\x1b[' + (12+this.cursor) + 'G'
}

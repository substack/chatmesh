#!/usr/bin/env node

var minimist = require('minimist')
var chat = require('./chat')
var bot = require('./bot')

var argv = minimist(process.argv.slice(2))

if (argv.bot) bot(argv)
else chat(argv)

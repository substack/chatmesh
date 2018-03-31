## Chatmesh

to create a chat room:

    node chat.js -d /tmp/chatdb -u username

to join a chat room:

    node chat.js -u username -d /tmp/chatdb dat://abcdef0123456789... 

if no username supplied, a random cat name is used


## Bot

to create a bot to ensure scrollback 

  node bot.js -u username -d /tmp/botdb dat://abcdef01234.... 


## Websocket Bridge and Web Client

to create a server with a websocket bridge

  node server.js -u username -d /tmp/server

navigate to URL/datkey:

  http://localhost:8080/abcdef01234...


  
  

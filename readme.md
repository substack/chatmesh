## Chatmesh

Peer-to-peer messenger (like IRC).

This is a basic terminal client.

For the desktop application, see [chatmesh-desktop](http://github.com/karissa/chatmesh-desktop)

Also see the [WIP Websocket experiment](chatmesh-ws](http://github.com/karissa/chatmesh-ws)

## Usage

```
npm install -g chatmesh
```

To create a chat room:

    `chatmesh -d /tmp/chatdb -u username`

If you don't supply a username, a random cat name is used.

To join a chat room:

    `chatmesh -u username -d /tmp/chatdb dat://abcdef0123456789...`

To create a bot to ensure scrollback for clients:

  `chatmesh --bot -u username -d /tmp/botdb dat://abcdef01234...`

## Commands

  * `/users` : see the list of users you're currently connected with

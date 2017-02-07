const ws = require('ws');
const SessionServer = require('./session-server.js');
const WebSocketSession = require('./ws-session.js');

const sessionServer = new SessionServer();

const server = new ws.Server({
  port: 3001,
  perMessageDeflate: false
});

server.on('connection', (conn) => {
  sessionServer.registerSession(conn);
});




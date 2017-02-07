const EventEmitter = require('events');
const WebSocketSession = require('../ws-session.js');
const wsmessage = require('../client/src/ws-message.js');

/**
 * Mocks a websocket by providing some of the same methods that a real one 
 * does.
 */
class Mocket extends EventEmitter {
  constructor() {
    super();
    this.receivedMessages = []; 
    this.errorCount = 0;
    this.failSend = false;
  }

  // nick is optional; if provided, it will be assigned to the server.
  static initializeSession(mocket, server, nick) {
    let sess = server.registerSession(mocket);

    if (nick) {
      var setnick = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SET_NICK,
        {
          "nick": nick
        });

      mocket.sendIn(JSON.stringify(setnick));
    }

    return sess;
  }

  get messages() {
    return this.receivedMessages.slice();
  }

  set breakOnSend(value) {
    this.failSend = value;
  }

  open() {
    this.emit('open');
  }

  send(text, callback) {
    if (this.failSend) {
      callback('Send failed.');
      this.errorCount++;
      return;
    }

    console.log(`Sending out ${text}...`);
    this.receivedMessages.push(text);
  }

  // Custom function for spoofing messages from the client
  sendIn(text) {
    this.emit('message', { data: text });
  }

  close() {
    this.emit('close');
  }

  error() {
    // This is only for testing so it's ok to suppress unhandled error events
    this.emit('error', 'Error in mock websocket!');
    this.emit('close');
  }
}

module.exports = Mocket;

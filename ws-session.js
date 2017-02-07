const wsmessage = require('./client/src/ws-message.js');
const MESSAGE_TYPES = wsmessage.WS_MESSAGE_TYPES;
const assert = require('assert');

class WebSocketSession {
  constructor(ws, server) {
    // Fail if required parameters are not given 
    assert.ok(ws);
    assert.ok(server);

    this.ws = ws;
    this.server = server;

    ws.on('message', processMessage.bind(this));
    ws.on('close', signOff.bind(this));
    ws.on('error', clientError);
  }

  /**
   * Sends a non-fatal error to the remote end of a websocket.
   * @param ws {WebSocket} The websocket connection through which the error will 
   *        be written.
   * @param errorMessage {String} The error message for the consumer.
   * @public
   */
  transmitError(errorMessage) {

    // Make a recognizable structure for the client to deal with
    let message = wsmessage.createMessage(
      MESSAGE_TYPES.ERROR,
      {
        "error": errorMessage
      });

    this.send(message);
  }

  /**
   * Sends data to the specified websocket.
   * @param message {Object} A message containing data to be written to the 
   *        target.
   */
  send(message, origin) {
    let serializedMessage = JSON.stringify(message);
    this.ws.send(serializedMessage, (err) => {
      // This is a server-side error, and so cannot be resolved at the client.
      // It may be caused by bad input, but it is still an input trust issue 
      // and does not justify bringing down the server.
      if (err) {
       console.error(
         `Error while attempting to send message to ${this.nick}: ${err}`)

        if (origin) {
          origin.transmitError(`Transmission to ${this.nick} failed.`);
        }
      }
    });
  }
}

function processMessage(data) {
  let message;

  try {
    console.dir(data);
    message = JSON.parse(data);
  } catch (e) {
    console.error('Parsing error: \n' + e.stack);
    this.transmitError('Invalid message format.');
    return;
  }

  switch (message.type) {
    case MESSAGE_TYPES.SET_NICK:
      signOn.call(this, message);
      break;
    case MESSAGE_TYPES.SEND:
      // If no name assigned, shouldn't receive a message.
      if (this.nick) {
        
        message.data.from = this.nick;

        // Find a recipient based on the information provided and send them 
        // the message.
        this.server.routeMessage(message, this);
      } else {
        this.transmitError('You must select a nick before sending messages.');
      }

      break;
    case MESSAGE_TYPES.SIGNOFF:
      signOff.call(this);
      break;
    default:
      // Other message types not relevant to server
      this.transmitError(`${message.type} is an unrecognized message.`);
      break;
  }
}

function signOff() {
  this.server.removeNick(this.nick);

  // The client can't spoof the nick from here
  // If we believed the client with a signoff, people could kick one another.
  var message = wsmessage.createMessage(
    MESSAGE_TYPES.SIGNOFF,
    {
      nick: this.nick
    });

  // Notify all listeners of signoff
  this.server.broadcast(message, this.nick);
}

function signOn(message) {
  let data = message.data;

  // Add old nick to message for broadcast
  message.data.old = this.nick;

  this.server.registerNick(this, data.nick);

  // Notify all listeners of new user/nick change
  this.server.broadcast(message, data.nick);
}

function clientError(error) {
  console.error('error in client connection:');
  console.dir(error);
}

module.exports = WebSocketSession;


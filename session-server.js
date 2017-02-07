const WebSocketSession = require('./ws-session.js');
const assert = require('assert');

class SessionServer {
  constructor() {
    this.sessions = {};
  }

  registerSession(ws) {
    // Keep a reference around to the session in the websocket
    return ws.session = new WebSocketSession(ws, this);
  }

  registerNick(owner, nick) {
    
    assert.ok(owner);

    if (!nick) {
      // No nick specified
      owner.transmitError('You need to choose a name.');
      return;
    }

    if (this.sessions[nick]) {
      // Someone else already has that name.
      owner.transmitError('Name already taken.');
      return;
    }

    this.sessions[nick] = owner;
    console.log(`${nick} registered with chat server.`);

    if (owner.nick) {
      // Changing nick
      delete this.sessions[owner.nick];
      console.log(`${nick} replaces ${owner.nick}.`);
    }

    // Allow for 'reverse lookup'
    owner.nick = nick;
  }

  removeNick(nick) {
    if (!nick) {
      // Fail silently - no harm done.
      return;
    }

    delete this.sessions[nick];
    console.log(`${nick} removed from chat server.`);
  }

  /**
   * Sends the same message to all or nearly all recipients.
   * @param message {Object} The message to be transmitted.
   * @param sessions {Object} The nick-keyed WS collection.
   * @param [excludeNick] {String} If included, this nick will not receive 
   *        the message.
   */
  broadcast(message, excludeNick) {
    let targets = [];

    for (var key in this.sessions) {
      if (key !== excludeNick) {
        targets.push(key);
      }
    }

    // Send to everyone in the list
    message.data.recipient = targets.slice();

    this.routeMessage(message);
  }

  routeMessage(message, origin) {
    console.dir(message);
    let recipient = message.data.recipient;
    const AT_LEAST_ONE = 'You must specify at least one recipient.';

    if (!recipient) {
      if (origin) { 
        origin.transmitError(AT_LEAST_ONE); 
      }
      return;
    }

    // A single name or a string - both are fine.
    if (!(recipient instanceof Array)) {
      recipient = [recipient];
    }

    if (recipient.length == 0) {
      if (origin) {
        origin.transmitError(AT_LEAST_ONE); 
      }

      return;
    }

    for (var i=0; i<recipient.length; i++) {
      this.sendMessage(recipient[i], message, origin);
    }
  }

  /**
   * Sends a message to a single socket.
   * @param targetName {String} The nick of the intended recipient.
   * @param message {Object} The message structure, containing 'type' and 'data' 
   *        members, that will be sent to the target recipient.
   * @param [origin] {WebSocketSession} The message's sender, if applicable.
   */
  sendMessage(targetName, message, origin) {
    var target = this.sessions[targetName];

    if (!target) {
      if (origin) {
        origin.transmitError(
          `Delivery failed. ${targetName} is offline`);
      }

      return;
    }

    // Write data to target
    target.send(message, origin);
  }
}

module.exports = SessionServer;

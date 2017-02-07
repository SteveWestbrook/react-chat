const assert = require('assert');
const WebSocketSession = require('../ws-session.js');
const SessionServer = require('../session-server.js');
const Mocket = require('./mocket.js');
const wsmessage = require('../client/src/ws-message.js');

describe('WebSocketSession', () => {
  describe('#constructor', () => {
    it('should fail if a socket is missing', () => {
      let server = new SessionServer();
      try {
        let sess = new WebSocketSession(null, server);
        assert.fail();
      } catch (e) {
      }
    });

    it('should fail if the session server is missing', () => {
      let mocket = new Mocket();
      try {
        let sess = new WebSocketSession(mocket);
        assert.fail();
      } catch (e) {
      }
    });

    it('should accept valid parameters in its constructor', () => {
      let mocket = new Mocket();
      let server = new SessionServer();
      let sess = new WebSocketSession(mocket, server);
      assert.ok(sess.transmitError);
      assert.ok(sess.send);
      assert.ok(!sess.signOn);
    });
  });

  describe('#integration tests', () => {
    it('should register against the server when a nick is sent to it',
      () => {
      
      let server = new SessionServer();
      let mocket = new Mocket();

      // Don't include a nick yet; that is the subject of this test.
      let sess = Mocket.initializeSession(mocket, server);

      assert.ok(!server.sessions['nik']);

      var setnick = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SET_NICK,
        {
          "nick": "nik"
        });

      mocket.sendIn(JSON.stringify(setnick));
      
      assert.equal(server.sessions['nik'], sess);
    }); 

    it('should disappear from the server when its socket is closed.', () => {
      let server = new SessionServer();
      let mocket = new Mocket();
      let sess = Mocket.initializeSession(mocket, server, 'nik')

      assert.equal(server.sessions['nik'], sess);

      mocket.close();

      assert.ok(!server.sessions['nik']);
    });

    it('should notify other sessions when it is opened.', () => {

      let server = new SessionServer();
      let mocket1 = new Mocket();
      let mocket2 = new Mocket();

      let preexisting1 = Mocket.initializeSession(mocket1, server, 'pre1');
      let preexisting2 = Mocket.initializeSession(mocket2, server, 'pre2');

      assert.equal(mocket1.messages.length, 1);
      assert.equal(mocket2.messages.length, 0);

      let mocket3 = new Mocket();
      let added = Mocket.initializeSession(mocket3, server, 'added');

      // Make sure both other sessions get the notification (and nothing else)
      assert.equal(mocket1.receivedMessages.length, 2);
      assert.equal(mocket2.receivedMessages.length, 1);

      // Make sure the opening socket does not get the notification
      assert.equal(mocket3.messages.length, 0);
      
      // validate the message in the other sessions
      let validateMessage = (message) => {
        message = JSON.parse(message);
        assert.equal(message.type, wsmessage.WS_MESSAGE_TYPES.SET_NICK);
        assert.equal(message.data.nick, 'added');
      };

      validateMessage(mocket1.messages.pop());
      validateMessage(mocket2.messages.pop());
    });

    it('should properly inform listeners when a nick is changed.', () => {

      let server = new SessionServer();
      let mocket1 = new Mocket();
      let mocket2 = new Mocket();

      let preexisting1 = Mocket.initializeSession(mocket1, server, 'pre1');
      let preexisting2 = Mocket.initializeSession(mocket2, server, 'pre2');

      assert.equal(mocket1.messages.length, 1);
      assert.equal(mocket2.messages.length, 0);

      let mocket3 = new Mocket();
      let added = Mocket.initializeSession(mocket3, server, 'added');

      // Make sure both other sessions get the notification (and nothing else)
      assert.equal(mocket1.receivedMessages.length, 2);
      assert.equal(mocket2.receivedMessages.length, 1);

      // Make sure the opening socket does not get the notification
      assert.equal(mocket3.messages.length, 0);

      var changeMessage = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SET_NICK,
        {
          "nick": "changed"
        });

      mocket2.sendIn(JSON.stringify(changeMessage));

      // The mocket2 queue should be unchanged.
      assert.equal(mocket2.receivedMessages.length, 1);

      // The others should have received the message.
      assert.equal(mocket1.receivedMessages.length, 3);
      assert.equal(mocket3.receivedMessages.length, 1);

      // validate the message in the other sessions
      let validateMessage = (message) => {
        message = JSON.parse(message);
        assert.equal(message.type, wsmessage.WS_MESSAGE_TYPES.SET_NICK);
        assert.equal(message.data.nick, 'changed');
        assert.equal(message.data.old, 'pre2');
      };

      validateMessage(mocket1.messages.pop());
      validateMessage(mocket3.messages.pop());
    });

    it('should notify sessions when it is closed.', () => {

      // setup
      let server = new SessionServer();
      let mocket1 = new Mocket();
      let mocket2 = new Mocket();

      let preexisting1 = Mocket.initializeSession(mocket1, server, 'pre1');
      let preexisting2 = Mocket.initializeSession(mocket2, server, 'pre2');

      assert.equal(mocket1.messages.length, 1);
      assert.equal(mocket2.messages.length, 0);

      let mocket3 = new Mocket();
      let added = Mocket.initializeSession(mocket3, server, 'added');

      // Make sure both other sessions get the notification (and nothing else)
      assert.equal(mocket1.receivedMessages.length, 2);
      assert.equal(mocket2.receivedMessages.length, 1);

      // Make sure the opening socket does not get the notification
      assert.equal(mocket3.messages.length, 0);

      // close the added socket
      mocket3.close();

      // Ensure the server has removed the session
      assert.ok(!server.sessions['added']);

      // Make sure both other sessions get the notification
      assert.equal(mocket1.receivedMessages.length, 3);
      assert.equal(mocket2.receivedMessages.length, 2);

      // Validate the message
      let validateMessage = (message) => {
        message = JSON.parse(message);
        assert.equal(message.type, wsmessage.WS_MESSAGE_TYPES.SIGNOFF);
        assert.equal(message.data.nick, 'added');
      };

      validateMessage(mocket1.messages.pop());
      validateMessage(mocket2.messages.pop());

      // Make sure the closing socket does not get the notification
      assert.equal(mocket3.messages.length, 0);
    });

    it('should close on an error', () => {
      let server = new SessionServer();
      let mocket1 = new Mocket();
      let mocket2 = new Mocket();
      let mocket3 = new Mocket();

      let pre1 = Mocket.initializeSession(mocket1, server, '1');
      let pre2 = Mocket.initializeSession(mocket2, server, '2');
      let toclose = Mocket.initializeSession(mocket3, server, '3');

      mocket3.error();

      // Make sure both other sessions get the notification
      let validateMessage = (message) => {
        message = JSON.parse(message);
        assert.equal(message.type, wsmessage.WS_MESSAGE_TYPES.SIGNOFF);
        assert.equal(message.data.nick, '3');
      };

      validateMessage(mocket1.messages.pop());
      validateMessage(mocket2.messages.pop());

      // Make sure the closing socket does not get the notification
      assert.equal(mocket3.messages.length, 0);
    });

    it('should be able to send a message to a particular destination',
      () => {
      
      let server = new SessionServer();
      let source = new Mocket();
      let target = new Mocket();
      let nobody = new Mocket();

      let sessionSource = Mocket.initializeSession(source, server, 'source');
      let sessionTarget = Mocket.initializeSession(target, server, 'target');
      let sessionNobody = Mocket.initializeSession(nobody, server, 'nobody');

      // Send message
      let message = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SEND,
        {
          "recipient": "target",
          "text": "message content",
          "from": "source"
        });

      message = JSON.stringify(message);
      source.sendIn(message);

      // Check the target session for a message
      let inboundMessage = target.messages.pop();
      assert.equal(inboundMessage, message);

      // The uninvolved party should not have received the message
      assert.equal(nobody.messages.length, 0);
    });
  });

  describe('#send()', () => {
    it('should notify the sender if transmission fails', () => {
      let server = new SessionServer();
      let sender = new Mocket();
      let session = Mocket.initializeSession(sender, server, 'sender');
      let origin = new Mocket();
      let originSession = Mocket.initializeSession(origin, server, 'origin');

      let message = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SEND,
        {
          "text": "hello",
          "recipient": "sender"
        });

      sender.breakOnSend = true;

      assert.equal(origin.messages.length, 0);

      session.send(message, originSession);

      assert.equal(origin.messages.length, 1);

      let response = origin.messages.pop();
      response = JSON.parse(response);

      assert.equal(response.type, wsmessage.WS_MESSAGE_TYPES.ERROR);
      assert.equal(response.data.error, 'Transmission to sender failed.')
    });
  });

  describe('#processMessage()', () => {
    

    it('should respond with an error if a message has an invalid format',
      () => {
      let server = new SessionServer();
      let mocket = new Mocket();
      let session = new WebSocketSession(mocket, server);      

      // invalid data
      mocket.sendIn('{...');

      assert.equal(mocket.messages.length, 1);
      let response = mocket.messages.pop();
      response = JSON.parse(response);

      assert.equal(response.type, wsmessage.WS_MESSAGE_TYPES.ERROR);
      assert.equal(response.data.error, 'Invalid message format.');
    });

    it('should respond with an error if the user has not signed on', () => {
      let server = new SessionServer();
      let mocket = new Mocket();
      let session = server.registerSession(mocket);

      let message = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SEND,
        {
          "text": "not going to get sent",
          "recipient": "abc"
        });
      message = JSON.stringify(message);

      mocket.sendIn(message);

      assert.equal(mocket.messages.length, 1);
      let response = mocket.messages.pop();
      response = JSON.parse(response);

      assert.equal(response.type, wsmessage.WS_MESSAGE_TYPES.ERROR);
      assert.equal(
        response.data.error,
        'You must select a nick before sending messages.');
    });

    it('should send an error for an unrecognized message type', () => {
      let server = new SessionServer();
      let mocket = new Mocket();
      let session = server.registerSession(mocket);

      let message = wsmessage.createMessage(99, '1234');
      message = JSON.stringify(message);

      mocket.sendIn(message);

      assert.equal(mocket.messages.length, 1);
      let response = mocket.messages.pop();
      response = JSON.parse(response);

      assert.equal(response.data.error, '99 is an unrecognized message.');
    });

    it('fails silently with a signoff for an unregistered nick', () => {

      let server = new SessionServer();
      let mocket = new Mocket();
      let session = server.registerSession(mocket);

      let message = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SIGNOFF);
      message = JSON.stringify(message);
      
      mocket.sendIn(message);

      assert.equal(mocket.messages.length, 0);
    });
  });

  it('should notify the sender if the target is offline', () => {
    
  });
});

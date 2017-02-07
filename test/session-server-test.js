const assert = require('assert');
const SessionServer = require('../session-server.js');
const Mocket = require('./mocket.js');
const WebSocketSession = require('../ws-session.js');
const wsmessage = require('../client/src/ws-message.js')

// Most cases are handled in ws-session-test, but a few are specific to the server only
describe('session-server', () => {

  describe('#registerNick()', () => {
    it('can register a nick', () => {
        let server = new SessionServer();
        let session = {};
        server.registerNick(session, 'asdf');

        assert.strictEqual(server.sessions['asdf'], session);
        });

    it('fails if no owner is given when registering a nick', () => {
        let server = new SessionServer();
        let session = {};
        try {
        server.registerNick(null, 'asdf');
        assert.fail();
        } catch (e) {
        }
        });

    it('fails if no nick is given', () => {
        let server = new SessionServer();
        let mocket = new Mocket();
        let session = new WebSocketSession(mocket, server, 'asdf');
        server.registerNick(session);

        let message = mocket.messages.pop();
        message = JSON.parse(message);
        assert.equal(message.type, wsmessage.WS_MESSAGE_TYPES.ERROR);
        assert.equal(message.data.error, 'You need to choose a name.');
        });

    it('fails with a duplicate name', () => {
        let server = new SessionServer();
        let mocket = new Mocket();
        let session = new WebSocketSession(mocket, server, 'asdf');
        server.registerNick(session, 'asdf');

        let mocket2 = new Mocket();
        let session2 = new WebSocketSession(mocket2, server, 'asdf');
        server.registerNick(session2, 'asdf');

        assert.equal(mocket2.messages.length, 1);

        let message = mocket2.messages.pop();
        message = JSON.parse(message);
        assert.equal(message.type, wsmessage.WS_MESSAGE_TYPES.ERROR);
        assert.equal(message.data.error, 'Name already taken.');
        assert.strictEqual(server.sessions['asdf'], session);
        });
  });

  describe('#removeNick()', () => {
   
    it('fails silently when no nick is given when removing', () => {
      let server = new SessionServer();
      server.removeNick();
    });

    it('fails silently when an unused nick is "removed"', () => {
      let server = new SessionServer();
      server.removeNick('not-here');
    });

    it('successfully removes a registered nick', () => {
      let server = new SessionServer();
      let session = {};
      server.registerNick(session, 'asdf');

      assert.strictEqual(server.sessions['asdf'], session);

      server.removeNick('asdf');
       
      assert.ok(!server.sessions['asdf']);
    });
  });

  describe('#routeMessage()', () => {

    it('fails when no recipient is specified when routing', () => {    
      let server = new SessionServer();
      let mocket = new Mocket();
      let session = new WebSocketSession(mocket, server);

      server.registerNick(session, 'abc');

      let message = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SEND,
        {
          "text": "this is text"
        });

      server.routeMessage(message, session);

      assert.equal(mocket.messages.length, 1);

      let deserialized = JSON.parse(mocket.messages.pop());
      assert.equal(deserialized.type, wsmessage.WS_MESSAGE_TYPES.ERROR);
    });

    it('fails when recipient exists but is empty', () => {
      let server = new SessionServer();
      let mocket = new Mocket();
      let session = new WebSocketSession(mocket, server);

      server.registerNick(session, 'abc');

      let message = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SEND,
        {
          "text": "this is text",
          "recipient": []
        });

      server.routeMessage(message, session);

      assert.equal(mocket.messages.length, 1);

      let deserialized = JSON.parse(mocket.messages.pop());
      assert.equal(deserialized.type, wsmessage.WS_MESSAGE_TYPES.ERROR); });

  });

  describe('#sendMessage()', () => {
    it('handles send failures', () => {
      let server = new SessionServer();
      let mocket = new Mocket();
      let session = Mocket.initializeSession(mocket, server, 'nick');

      let message = wsmessage.createMessage(
        wsmessage.WS_MESSAGE_TYPES.SEND,
        {
          "text": "nope"
        });

      server.sendMessage('not-here', message, session);

      assert.equal(mocket.messages.length, 1);

      let response = JSON.parse(mocket.messages.pop());
      assert.equal(response.type, wsmessage.WS_MESSAGE_TYPES.ERROR);
      assert.equal(
        response.data.error,
        'Delivery failed. not-here is offline');
    });
  });
});

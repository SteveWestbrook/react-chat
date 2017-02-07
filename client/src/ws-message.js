
var WS_MESSAGE_TYPES = {
  ERROR: 0,
  SET_NICK: 1,
  SEND: 2,
  SIGNOFF: 3
};

// This is intended for both client and server-side use, and won't necessarily
// be used via browserify
if (module) {
  module.exports = {
    createMessage: createMessage,
    WS_MESSAGE_TYPES: WS_MESSAGE_TYPES
  };
}

function createMessage(messageType, data) {
  return {
    "type": messageType,
    "data": data
  };
}

import React from 'react'
import TextWindow from './TextWindow'
import SignOn from './SignOn'
import update from 'immutability-helper'
const wsmessage = require('./ws-message.js');
const WS_MESSAGE_TYPES = wsmessage.WS_MESSAGE_TYPES;

class Chat extends React.Component {
  
  constructor(props) {
    super(props);

    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.signOn = this.signOn.bind(this);
    this.connectionOpen = this.connectionOpen.bind(this);
    this.connectionClosed = this.connectionClosed.bind(this);
    this.connectionError = this.connectionError.bind(this);
    this.connectionMessage = this.connectionMessage.bind(this);
    this.handleMessage = this.handleMessage.bind(this);

    this.state = {
      currentMessage: '',
      connection: null,
      oldNick: null,
      errorText: null,
      users: [],
      recipients: [],
      messages: []
    };
  }

  componentDidMount() {
    var ws = new WebSocket('ws://localhost:3001/');
    this.setState({ connection: ws });

    ws.onopen = this.connectionOpen;
    ws.onclose = this.connectionClosed;
    ws.onerror = this.connectionError;
    ws.onmessage = this.connectionMessage;
  }

  componentWillUnmount() {
    var ws = this.state.connection;
    this.setState({ connection: null });

    // Shut down connection explicitly if possible
    if (ws) {
      ws.close();
    }
  }

  sendMessage(message) {
    let message = wsmessage.createMessage(
      WS_MESSAGE_TYPES.SEND,
      {
        recipients: this.state.recipients
      });

    message = JSON.stringify(message);
    this.state.connection.send(message);
  }

  handleKeyPress(e) {
    
  }

  handleChange(e) {
    
  }

  signOn(nick) {
    let signOnMessage = wsmessage.createMessage(
      WS_MESSAGE_TYPES.SET_NICK,
      {
        "nick": nick,
        "old": this.state.oldNick
      });

    this.transmit(signOnMessage);
    this.setState({oldNick: nick});
    // TODO: Reset enabled state    
  }

  transmit(message) {
    var ws = this.state.connection;
    message = JSON.stringify(message);
    ws.send(message);
  }

  connectionOpen() {
  }

  connectionClosed() {
    // TODO: Retry connection if not shutting down
  }

  connectionError() {
  }

  connectionMessage(data) {
    this.handleMessage(data);
  }

  handleMessage(data) {
    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      console.error(e);
      return;
    }

    switch (message.type) {
      case WS_MESSAGE_TYPES.ERROR:
        this.setState({ errorText: message.data.error });
        break;
      case WS_MESSAGE_TYPES.SET_NICK:
        let updated = React.addons.update(this.state, {
          users: {          
            $push: [message.data.nick]
          }
        });

        this.setState(updated);
        
        break;
      case WS_MESSAGE_TYPES.SEND:
        let updated = React.addons.update(this.state, {
          messages: {
            $push: [{
              from: message.data.from,
              text: message.data.text
            }]
          }
        })
        break;
      case WS_MESSAGE_TYPES.SIGNOFF:
        this.setState((state) => {
          let users = state.users;
          let nick = message.data.nick;
          let index = -1;

          while ((index = state.users.indexOf) >= 0) {
            users = users.slice(0, index).concat(
              users.slice(index+1));
          }

          return { users: users };
        });

        break;
      default:
        break;
    }
  }

  render() {
    return (
      <div className="Chat-main">
        <SignOn signOn={this.signOn}/>
        <TextWindow />
        <textarea 
          onKeyPress={this.handleKeyPress} 
          onChange={this.handleChange}
          value={this.state.currentMessage}/>
      </div>
    );
  }
}

export default Chat;

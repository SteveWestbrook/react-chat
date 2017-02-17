import './Chat.css'
import React from 'react'
import TextWindow from './TextWindow'
import SignOn from './SignOn'
import update from 'immutability-helper'
const wsmessage = require('./ws-message.js');
const WS_MESSAGE_TYPES = wsmessage.WS_MESSAGE_TYPES;

class Chat extends React.Component {
  
  constructor(props) {
    super(props);

    this.handleChange = this.handleChange.bind(this);
    this.handleRecipientChange = this.handleRecipientChange.bind(this);
    this.sendMessage = this.sendMessage.bind(this);
    this.signOn = this.signOn.bind(this);
    this.connectionOpen = this.connectionOpen.bind(this);
    this.connectionClosed = this.connectionClosed.bind(this);
    this.connectionError = this.connectionError.bind(this);
    this.connectionMessage = this.connectionMessage.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.initializeConnection = this.initializeConnection.bind(this);

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
    this.initializeConnection();
  }

  initializeConnection() {
    var ws = new WebSocket('ws://localhost:3000/');
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

  sendMessage(text) {
    let message = wsmessage.createMessage(
      WS_MESSAGE_TYPES.SEND,
      {
        recipients: this.state.recipients,
        text: text
      });

    message = JSON.stringify(message);
    this.state.connection.send(message);
  }

  handleChange(e) {
    this.setState({
      currentMessage: e.target.value
    });
  }

  handleRecipientChange(e) {
    this.setState({
      recipients: e.target.value
    });
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
    // Retry connection if not shutting down
    var ws = this.state.connection;

    // Connection is cleared on shutdown
    if (ws != null) {
      this.initializeConnection();
    }
  }

  connectionError() {
  }

  connectionMessage(data) {
    this.handleMessage(data);
  }

  handleMessage(data) {
    let message;
    try {
      message = JSON.parse(data.data);
    } catch (e) {
      console.error(e);
      return;
    }

    switch (message.type) {
      case WS_MESSAGE_TYPES.ERROR:
        this.setState({ errorText: message.data.error });
        break;
      case WS_MESSAGE_TYPES.USER_LIST:
        this.setState({ users: message.users });
        break;
      case WS_MESSAGE_TYPES.SET_NICK:
        let updatedUsers = update(this.state, {
          users: {          
            $push: [message.data.nick]
          }
        });

        this.setState(updatedUsers);
        
        break;
      case WS_MESSAGE_TYPES.SEND:
        let updatedMessages = update(this.state, {
          messages: {
            $push: [{
              from: message.data.from,
              text: message.data.text
            }]
          }
        });

        this.setState(updatedMessages);

        break;
      case WS_MESSAGE_TYPES.SIGNOFF:
        this.setState((state) => {
          let users = state.users;
          let nick = message.data.nick;
          let index = -1;

          while ((index = state.users.indexOf(nick)) >= 0) {
            users.splice(index);
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
        <div className="Chat-messages">
          <TextWindow messages={this.state.messages} />
          <textarea 
            className="Chat-entry"
            onChange={this.handleChange}
            value={this.state.currentMessage}/>
        </div>

        <div className="Chat-recipients-container">
          <select 
            className="Chat-recipients"
            multiple 
            value={this.state.users} 
            onChange={this.handleRecipientChange}>
            {
              (
                this.state.users.map((user) => {
                  return (<option key={user}>{user}</option>);
                })
              )
            }
          </select>
        </div>
      </div>
    );
  }
}

export default Chat;

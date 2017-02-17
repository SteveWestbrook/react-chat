import React, { Component } from 'react';
import './App.css';
import Chat from './Chat'

class App extends Component {
  render() {
    return (
      <div className="App-wrapper">
        <div className="App-header">
          <h3 className="App-title">
            react-chat: A react-based chat utility
          </h3>
        </div>
        <Chat />
      </div>
    );
  }
}

export default App;

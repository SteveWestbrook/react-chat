import './TextWindow.css'
import React from 'react'

class TextWindow extends React.Component {
  render() {
    const items = this.props.messages.map((message) => {
      return (
        <div className="Text-message">
          <b>{message.from}</b>{message.text}
        </div>
        );
    });

    return (
      <div className="Text-window">
        {items}
      </div>
    );
  }
}

export default TextWindow;

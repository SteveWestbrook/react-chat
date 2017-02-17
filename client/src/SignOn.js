import './SignOn.css'
import React from 'react'

class SignOn extends React.Component {
  constructor(props) {
    super(props);

    this.signOn = this.signOn.bind(this);
    this.handleNickChange = this.handleNickChange.bind(this);

    this.state = {
      "nick": ""
    };
  }

  signOn() {
    if (this.props.signOn) {
      this.props.signOn(this.state.nick);
    }
  }

  handleNickChange(e) {
    this.setState({ "nick": e.target.value });   
  }

  render() {
    return (
      <div className="SignOn-main">
        <input 
          type="text" 
          className="SignOn-text" 
          onChange={this.handleNickChange} 
          value={this.state.nick} />
        <button 
          className="SignOn-button" 
          onClick={this.signOn}>
          Sign On
          </button>
      </div>
    );
  }
}

export default SignOn

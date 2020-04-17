import React, { Component } from 'react';
import Say from 'jaxcore-say';
import BumbleBee, { SpectrumAnalyser } from 'bumblebee-hotword';

const port = 4224;

export default class PiaApp extends Component {
  constructor() {
    super();

    this.state = {
      //hotwords: Object.keys(this.bumblebee.hotwords),
      bumblebeeStarted: false,
      results: [],
      // grasshopper, terminator
      selectedHotword: "grasshopper",
      sensitivity: 0.6,
      muted: false,
    };

    this.bumblebee = new BumbleBee();
  }

  componentDidMount() {
    this.bumblebee.setWorkersPath('./porcupine');
    this.bumblebee.addHotword(this.state.selectedHotword);
    this.bumblebee.setHotword(this.state.selectedHotword);
    this.bumblebee.start();

    this.setState({
      bumblebeeStarted: true,
    });

    Say.setWorkers({
      'espeak': 'espeak/espeak-en-worker.js'
    });
    this.voice = new Say({
      language: 'en',
      // Leon, Scotty, Cylon
      profile: 'Cylon',
    });

    this.bumblebee.on('hotword', hotword => {
      if (hotword !== this.state.selectedHotword) {
        console.log('did not recognize', hotword);
        return;
      }
      console.log('recognized hotword', hotword);

      this.listenToCommand();
    });

    this.bumblebee.on('analyser', (analyser) => {
      console.log('analyser', analyser);
      var canvas = document.getElementById('oscilloscope');
      this.analyser = new SpectrumAnalyser(analyser, canvas);
      if (this.state.muted) {
        this.bumblebee.setMuted(true);
        this.analyser.setMuted(true);
      }
      this.analyser.start();
    });

    this.bumblebee.on('data', (data) => {
      if (this.state.commandStarted) {
        this.commandAudio(data.buffer)
      }
    });
  }

  render() {
    return (
      <div className="App">

        <div className="sound-controls">
          {this.renderSay()}

          <canvas id="oscilloscope" width="100" height="60" />

          <button onClick={e => this.toggleMuted()}>
            {this.state.muted ? 'Unmute' : 'Mute'}
          </button>

          <div id="sensitivity-box">
            <label id="sensitivity-label" htmlFor="sensitivity">Sensitivity</label>
            <select
              id="sensitivity"
              value={this.state.sensitivity||''}
              onChange={e => this.changeSensitivity(e)}>
            { this.renderSensitivities() }
            </select>
          </div>
        </div>

        {this.renderResults()}

      </div>
    );
  }

  renderResults() {
    let b = this.state.results.map((resp, i) => {
      return [
        <li key={ i * 2 } className="input">{ resp.input }</li>,
        <li key={ i * 2 + 1 } className="response">{ resp.response }</li>
      ];
    });
    return (<ul>
      {b}
    </ul>);
  }

  renderSay() {
    if (!this.state.bumblebeeStarted) {
      return;
    } else if (this.state.selectedHotword) {
      return (<p>To start, say "{this.state.selectedHotword}"</p>);
    }
  }

  renderSensitivities(e) {
    let s = [];
    for (let i=0;i<=10;i++) {
      let n = i / 10; //Math.round(i / 10) / 10:
      let p = i * 10; //Math.round(i / 10) / 10:
      s.push(<option key={i} value={n}>{p}%</option>);
    }
    return s;
  }

  changeSensitivity(e) {
    let sensitivity = e.target.options[e.target.selectedIndex].value;

    if (this.state.bumblebeeStarted) {
      this.bumblebee.stop();
      this.bumblebee.setSensitivity(sensitivity);
      this.bumblebee.start();
    } else {
      this.bumblebee.setSensitivity(sensitivity);
    }
    this.setState({
      sensitivity
    });
  }

  toggleMuted() {
    const muted = !this.state.muted;
    this.setState({
      muted
    }, () => {
      this.bumblebee.setMuted(muted);
      if (this.analyser) {
        this.analyser.setMuted(muted);
      }
    });
  }

  listenToCommand() {
    if (this.state.commandStarted) {
      console.log("command end, due to new command");
      this.commandEnd();
    }
    // Command starts
    console.log('command start');
    if (this.analyser) {
      const green = "#22EE00";
      this.analyser.setBackgroundColor(green);
    }
    this.setState({
      commandStarted: new Date(),
    });
    //this.voice.say('at your service...');

    const maxCommandLength = 5; // seconds
    setTimeout(() => {
      // Command ends
      if (this.state.commandStarted) {
        console.log("command end, due to timeout");
        this.commandEnd();
      }
    }, maxCommandLength * 1000);

    let url = window.location.protocol + "//" + window.location.hostname + ":" + port + "/speechToText";
    // <https://developer.mozilla.org/en-US/docs/Web/API/Request/Request>
    // <https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream>
    // <https://jakearchibald.com/2016/streams-ftw/#creating-your-own-readable-stream>
    let me = this;
    let sendStream = new ReadableStream({
      start(controller) {
        me.streamController = controller;
      },
      cancel() {
        me.streamController = null;
      },
    });
    this.fetch = fetch(url, {
      method: "PUT",
      body: sendStream,
    });
    console.log("Opened sending stream to " + url);
  }

  commandAudio(buffer) {
    console.log("command audio: ", buffer);
    //console.log("audio data JSON: " + JSON.stringify(buffer));
    if (this.streamController) {
      this.streamController.enqueue(buffer);
    }
  }

  async commandEnd(buffer) {
    console.log("command end");

    this.setState({
      commandStarted: null,
    });

    if (this.analyser) {
      this.analyser.setBackgroundColor("black");
    }

    try {
      if ( !this.streamController) {
        return;
      }
      console.log("Closing sending streaming");
      this.streamController.close();
      console.log("Waiting for server");
      let response = await this.fetch;
      console.log("Server responded");
      let json = await response.json();
      console.log("Reponse: ", json);

      const results = this.state.results;
      results.push(json);
      this.setState({
        results: results,
      });
    } catch (ex) {
      console.error(ex);
    }
  }
}

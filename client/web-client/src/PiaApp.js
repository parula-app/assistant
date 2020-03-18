import React, {Component} from 'react';
import Say from 'jaxcore-say';

import BumbleBee, {SpectrumAnalyser} from 'bumblebee-hotword';
const bumblebee = new BumbleBee();
bumblebee.setWorkersPath('./porcupine');
bumblebee.addHotword('grasshopper');
bumblebee.addHotword('terminator');

Say.setWorkers({
	'espeak': 'espeak/espeak-en-worker.js'
});
const voice = new Say({
	language: 'en',
	// Leon, Scotty, Cylon
	profile: 'Cylon',
});

class PiaApp extends Component {
	constructor() {
		super();

		this.state = {
			hotwords: Object.keys(bumblebee.hotwords),
			bumblebee_started: false,
			results: [],
			selectedHotword: "grasshopper",
			sensivitiyChanged: false,
			sensitivity: 0.6,
			muted: false,
		};

		this.sounds = {
			//grasshopper: new Audio('sounds/grasshopper.mp3'),
		};

		bumblebee.on('hotword', (word) => {
			this.recognizeHotword(word);
		});
	}

	componentDidMount() {
		bumblebee.setHotword(this.state.selectedHotword);

		bumblebee.on('analyser', (analyser) => {
			console.log('analyser', analyser);
			var canvas = document.getElementById('oscilloscope');
			this.analyser = new SpectrumAnalyser(analyser, canvas);
			if (this.state.muted) {
				bumblebee.setMuted(true);
				this.analyser.setMuted(true);
			}
			this.analyser.start();
		});

		bumblebee.start();

		this.setState({
			bumblebee_started: true,
			sensivitiyChanged: true,
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
					  <label id="sensitivity-label" for="sensitivity">Sensitivity</label>
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

	renderSay() {
		if (!this.state.bumblebee_started) {
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

		if (this.state.sensivitiyChanged) {
			alert('Sensitivity can only be set before .start(), reload and try again');
		} else {
			this.setState({
				sensitivity
			});
			bumblebee.setSensitivity(sensitivity);
		}
	}

	toggleMuted() {
		const muted = !this.state.muted;
		this.setState({
			muted
		}, () => {
			bumblebee.setMuted(muted);
			if (this.analyser) {
				this.analyser.setMuted(muted);
			}
		});
	}

	recognizeHotword(hotword) {
		if (hotword === this.state.selectedHotword) {
			console.log('recognized hotword', hotword);
			this.listenToCommand();

			voice.say('at your service...');
			//this.sounds['grasshopper'].play();

			const results = this.state.results;
			results.push(hotword);

			this.setState({
				results
			});
		} else {
			console.log('did not recognize', hotword);
		}
	}

	listenToCommand() {
		if (this.analyser) {
			const green = "#22EE00";
			this.analyser.setBackgroundColor(green);
		}
		setTimeout(() => {
			if (this.analyser) {
				this.analyser.setBackgroundColor("black");
			}
		}, 5000);
	}

	renderResults() {
		let b = this.state.results.map((word,i) => {
			return (<li key={i}>{word}</li>);
		});
		return (<ul>
			{b}
		</ul>);
	}
}

export default PiaApp;

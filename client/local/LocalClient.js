'use strict';

import { Client } from '../Client.js';
import AudioVideoPlayer from './MPDPlayer.js';
import audioInput, { load as loadAudioInput } from './audioInputNAudioDon.js';
import audioOutput from './audioOutputSox.js';
import { waveFile } from './audioFile.js';
import { speechToText, textToSpeech, wakeword, load as loadSpeechEngines } from '../../speech/speech.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

/**
 * This and `Client` is the central code that calls all the other modules.
 *
 * This is a commandline application that uses the
 * local audio devices to listen to and output speech.
 */
export class LocalClient extends Client {
  async load(lang) {
    await loadSpeechEngines(lang);
    await loadAudioInput();
    this._player = new AudioVideoPlayer();
    await super.load(lang);
  }

  async start() {
    await super.start();
    const kMax = getConfig().audio.maxCommandLength;
    let recognizer = null;
    let audioProps = speechToText.audioProperties();
    wakeword.waitForWakeWord(audioInput(audioProps), kMax, () => { // new command
      assert(!recognizer, "End previous command first");
      playSound("on");
      recognizer = new speechToText.SpeechRecognizer();
    }, (buffer) => {
      recognizer.processAudio(buffer);
    }, async () => { // command complete
      try {
        let inputText = recognizer.end();
        recognizer = null;
        if (!inputText) {
          return;
        }
        console.log("Command: " + inputText);
        let response;
        //let response = await this.intentParser.startApp(inputText);
        try {
          let { intent, args } = await this.intentParser.match(inputText);
          playSound("accept");
          response = await this.intentParser.startIntent(intent, args);
        } catch (ex) { // Intent had an error, or we didn't find a match
          playSound("error");
          if (ex.code == "intent-match-failed") {
            console.error(ex.message);
            return; // Just the error sound
          } else {
            console.error(ex);
            response = ex.message || ex;
          }
        }
        console.log("\n" + response + "\n");
        if (response) {
          await audioOutput(await textToSpeech.textToSpeech(response));
        }
      } catch (ex) {
        console.error(ex);
      }
    });
  }

  async unload() {
    await speechToText.unload();
    await super.unload();
  }

  get player() {
    return this._player;
  }
}

async function playSound(file) {
  try {
    let waveStream = waveFile(`./client/local/sounds/${file}.wav`);
    waveStream.audio.volume = 0.5;
    await audioOutput(waveStream);
  } catch (ex) {
    console.error(ex);
  }
}

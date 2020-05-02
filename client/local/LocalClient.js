'use strict';

import { Client } from '../Client.js';
import * as audioInOut from './audioInOut.js';
import * as wakeword from './bumblebee.js';
import * as speechToText from '../../speechToText.js';
import * as textToSpeech from '../../textToSpeech.js';

/**
 * This and `Client` is the central code that calls all the other modules.
 *
 * This is a commandline application that uses the
 * local audio devices to listen to and output speech.
 */
export class LocalClient extends Client {
  async load() {
    await audioInOut.load();
    await wakeword.load();
    await super.load();
  }

  async start() {
    await super.start();
    let recognizer;
    wakeword.waitForWakeWord(audioInOut.audioInput(), 7, () => { // new command
      recognizer = new speechToText.SpeechRecognizer();
    }, (buffer) => {
      recognizer.processAudio(buffer);
    }, () => { // command complete
      let inputText = recognizer.end(recognizer);
      console.log("Command: " + inputText);
      (async () => {
        let response = await this.intentParser.startApp(inputText);
        console.log("\n" + response + "\n");
      })();
    });
  }
}

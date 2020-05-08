'use strict';

import { Client } from '../Client.js';
import audioInput, { load as audioInputLoad} from './audioInput.js';
import audioOutput from './audioOutput.js';
import * as wakeword from './bumblebee.js';
import * as speechToText from '../../speechToText.js';
import * as textToSpeech from '../../textToSpeech.js';
import * as wtn from 'words-to-numbers';
const wordsToNumbers = wtn.default.wordsToNumbers;

/**
 * This and `Client` is the central code that calls all the other modules.
 *
 * This is a commandline application that uses the
 * local audio devices to listen to and output speech.
 */
export class LocalClient extends Client {
  async load() {
    await audioInputLoad();
    await wakeword.load();
    await super.load();
  }

  async start() {
    await super.start();
    let recognizer;
    wakeword.waitForWakeWord(audioInput(), 7, () => { // new command
      recognizer = new speechToText.SpeechRecognizer();
    }, (buffer) => {
      recognizer.processAudio(buffer);
    }, async () => { // command complete
      try {
        let inputText = recognizer.end(recognizer);
        inputText = wordsToNumbers(inputText) + ""; // leaves text as-is, only replaces numbers
        console.log("Command: " + inputText);
        let response = await this.intentParser.startApp(inputText);
        console.log("\n" + response + "\n");
        await audioOutput(await textToSpeech.textToSpeech(response));
      } catch (ex) {
        console.error(ex);
      }
    });
  }
}

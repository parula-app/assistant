'use strict';

import { Client } from '../Client.js';
import AudioVideoPlayer from './MPDPlayer.js';
import audioInput, { load as audioInputLoad} from './audioInput.js';
import audioOutput from './audioOutput.js';
import { speechToText, textToSpeech, wakeword } from '../../speech/speech.js';
import * as wtn from 'words-to-numbers';
const wordsToNumbers = wtn.default.wordsToNumbers;
import { getConfig } from '../../util/config.js';

/**
 * This and `Client` is the central code that calls all the other modules.
 *
 * This is a commandline application that uses the
 * local audio devices to listen to and output speech.
 */
export class LocalClient extends Client {
  async load(lang) {
    await audioInputLoad();
    await wakeword.load();
    await speechToText.load(lang);
    await textToSpeech.load(lang);
    this._player = new AudioVideoPlayer();
    await super.load(lang);
  }

  async start() {
    await super.start();
    const kMax = getConfig().audio.maxCommandLength;
    let recognizer;
    wakeword.waitForWakeWord(audioInput(), kMax, () => { // new command
      recognizer = new speechToText.SpeechRecognizer();
    }, (buffer) => {
      recognizer.processAudio(buffer);
    }, async () => { // command complete
      try {
        let inputText = recognizer.end(recognizer);
        if (!inputText) {
          return;
        }
        //inputText = wordsToNumbers(inputText) + ""; // leaves text as-is, only replaces numbers
        console.log("Command: " + inputText);
        let response = await this.intentParser.startApp(inputText);
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

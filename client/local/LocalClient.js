#!/usr/bin/env node
'use strict';

import { Client } from '../Client.js';
import * as audioInOut from './audioInOut.js';
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
    await super.load();
  }

  async start() {
    await super.start();
    let inputAudioBuffer = await audioInOut.audioInput();
    let inputText = await speechToText.speechToText(inputAudioBuffer);
    let response = await this.intentParser.startApp(inputText);
    console.log("\n" + response + "\n");
    await this.quit();
  }
}

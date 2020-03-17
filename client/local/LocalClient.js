#!/usr/bin/env node
'use strict';

import { Client } from '../Client.js';
import * as audioInOut from './audioInOut.js';
import * as speechToText from '../../speechToText.js';
import * as textToSpeech from '../../textToSpeech.js';
import * as streamBuffers from 'stream-buffers';
const ReadableStreamBuffer = streamBuffers.default.ReadableStreamBuffer;
import * as audioFile from './audioFile.js';

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
    let memoryStream = new ReadableStreamBuffer();
    memoryStream.put(inputAudioBuffer);
    audioFile.saveAudioFile(memoryStream);
    memoryStream.stop();

    let inputText = await speechToText.speechToText(inputAudioBuffer);
    let response = await this.intentParser.startApp(inputText);
    console.log("\n" + response + "\n");
    await this.quit();
  }
}

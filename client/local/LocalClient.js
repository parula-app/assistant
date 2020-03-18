#!/usr/bin/env node
'use strict';

import { Client } from '../Client.js';
import * as audioInOut from './audioInOut.js';
import * as wakeword from './porcupine.js';
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
    await wakeword.load();
    await super.load();
  }

  async start() {
    await super.start();
    let recognizer;
    let memoryStream;
    wakeword.waitForWakeWord(audioInOut.audioInput(), 10, () => { // new command
      recognizer = new speechToText.SpeechRecognizer();
      memoryStream = new ReadableStreamBuffer();
    }, (buffer) => {
      memoryStream.put(buffer);
      recognizer.processAudio(buffer);
    }, () => { // command complete
      audioFile.saveAudioFile(memoryStream);
      memoryStream.stop();
      let inputText = recognizer.end(recognizer);
      console.log("Command: " + inputText);
      (async () => {
        let response = await this.intentParser.startApp(inputText);
        console.log("\n" + response + "\n");
      })();
    });
  }
}

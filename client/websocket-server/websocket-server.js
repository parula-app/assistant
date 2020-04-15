#!/usr/bin/env node
'use strict';

import { Client } from '../Client.js';
import * as audioInOut from './audioInOut.js';
import socketIO from 'socket.io';
import * as speechToText from '../../speechToText.js';
import * as textToSpeech from '../../textToSpeech.js';
import * as streamBuffers from 'stream-buffers';
const ReadableStreamBuffer = streamBuffers.default.ReadableStreamBuffer;
import * as audioFile from './audioFile.js';

const port = 4224;

/**
 * This is the server part of a web client.
 * A web page records the audio from the microphone using the browser APIs.
 * The web page also does the wake word detection. Once a wake word is
 * recognized, the web page emits:
 * 1. command-start
 * 2. command-audio for each audio fragment
 */
export class WebSocketServer extends Client {
  constructor() {
    super();
    this.server = null;
  }

  async load() {
    await audioInOut.load();
    await wakeword.load();
    await super.load();
  }

  async start() {
    await super.start();
  }

  /**
   * A client (web page) connects
   */
  async instance() {
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

async function start() {
  try {
    const server = socketIO.listen(port);
    server.on('connection', instance => {
      instance.on('command-start', buffer => {
        console.log("Command start");
      });
      instance.on('command-audio', buffer => {
        console.log("Buffer", buffer);
      });
      instance.on('command-end', buffer => {
        console.log("Command end");
      });
    })
  } catch (ex) {
    console.error(ex);
  }
}

start();

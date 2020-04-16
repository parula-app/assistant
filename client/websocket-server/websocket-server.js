#!/usr/bin/env node
'use strict';

import fs from 'fs';
import https from 'https';
import WebSocket from 'ws';
import WebSocketWrapper from 'ws-wrapper';
import { Client } from '../Client.js';
import * as speechToText from '../../speechToText.js';
import * as textToSpeech from '../../textToSpeech.js';
import * as streamBuffers from 'stream-buffers';
const ReadableStreamBuffer = streamBuffers.default.ReadableStreamBuffer;

const port = 4224;

/**
 * This is the server part of a web client.
 * A web page records the audio from the microphone using the browser APIs.
 * The web page also does the wake word detection. Once a wake word is
 * recognized, the web page emits:
 * 1. command-start
 * 2. command-audio for each audio fragment
 * 3. command-end at the end of the command, i.e. silence or max length
 */
export class WebSocketServer extends Client {
  async load() {
    await speechToText.load();
    await super.load();
  }

  async start() {
    await super.start();

    const wss = new WebSocket.Server({ port: port });
    wss.on("connection", socketConnection => {
      let socket = new WebSocketWrapper(socketConnection);
      let conn = new Connection();
      socket.on("msg", (from, msg) => {
        console.log(`Received message from ${from}: ${msg}`);
      });
      socket.of("command").on("start", (from, msg) => {
        conn.commandStart();
      });
      socket.of("command").on("audio", (from, buffer) => {
            conn.commandAudio(buffer);
      });
      socket.of("command").on("end", (from, msg) => {
        conn.commandEnd();
      });
    });
    console.log("WebSocket server listening to port " + port);
  }
}

/**
  * A client (web page) connects
  */
class Connection {
  commandStart() {
    console.log("Command start");
    this.recognizer = new speechToText.SpeechRecognizer();
    this.memoryStream = new ReadableStreamBuffer();
  }
  commandAudio(buffer) {
    console.log("Command audio");
    this.memoryStream.put(buffer);
    this.recognizer.processAudio(buffer);
  }
  commandEnd() {
    console.log("Command end");
    audioFile.saveAudioFile(this.memoryStream);
    this.memoryStream.stop();
    let inputText = this.recognizer.end(buffer);
    this.recognizer = null;
    (async () => {
      console.log("Command: " + inputText);
      let response = await this.intentParser.startApp(inputText);
      console.log("\n" + response + "\n");
    })();
  }
}

(async () => {
  try {
    await new WebSocketServer().start();
  } catch (ex) {
    console.error(ex);
  }
})();

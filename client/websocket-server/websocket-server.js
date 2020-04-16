#!/usr/bin/env node
'use strict';

import fs from 'fs';
import https from 'https';
import WebSocket from 'ws';
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

    const server = https.createServer();
    const wss = new WebSocket.Server({ server });

    wss.on("connection", socketConnection => {
      let conn = new Connection();
      socketConnection.on("message", message => {
        try {
          if (!message.func) {
            throw new Error("Unknown WebSocket message format\n" + JSON.stringify(message.func, null, 2));
          } else if (message.func == "command-start") {
            conn.commandStart();
          } else if (message.func == "command-audio") {
            conn.commandAudio(message.arg);
          } else if (message.func == "command-end") {
            conn.commandEnd();
          } else {
            throw new Error("Unknown WebSocket function " + message.func);
          }
        } catch (ex) {
          console.error(ex);
        }
      });
    });

    server.listen(port);
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

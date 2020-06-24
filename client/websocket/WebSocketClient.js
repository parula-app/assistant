#!/usr/bin/env node
'use strict';

import fs from 'fs';
import https from 'https';
import WebSocket from 'ws';
import { WSCall } from '../../util/WSCall.js';
import { Client } from '../Client.js';
import { speechToText, textToSpeech, wakeword, load as loadSpeechEngines } from '../../speech/speech.js';
import AudioVideoPlayer from './MPDPlayer.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

const kPort = 12779;

/**
 * This allows Pia core (this process) to run in a different process than the
 * audio I/O (the remote client).
 *
 * This is the WebSocket server part (yes, the irony) of a remote client.
 * A web page or native app (called client here) in another process records the audio
 * from the microphone, e.g. using the browser APIs.
 * The client also does the wake word detection. Once a wake word is
 * recognized, the client emits:
 * 1. command-start
 * 2. command-audio for each audio fragment
 * 3. command-end at the end of the command, i.e. silence or max length
 */
export class WebSocketClient extends Client {
  constructor() {
    super();
    this.recognizer = null; // {DeepSpeech}
  }

  async load() {
    await loadSpeechEngines(lang);
    this._player = new AudioVideoPlayer();
    await super.load();
    this._createServer();
  }

  async _createServer() {
    let server = new WebSocket.Server({ port: kPort });
    return new Promise((resolve, reject) => {
      server.on("connection", webSocket => {
        try {
          let wsCall = new WSCall(webSocket);
          wsCall.register("command/start", json => this.commandStart(json, wsCall));
          webSocket.on("command/audio", buffer => this.commandAudio(buffer));
          wsCall.register("command/end", json => this.commandEnd(json, wsCall));
          resolve();
        } catch (ex) {
          reject(ex);
        }
      });
    });
  }

  async start() {
    await super.start();
    console.log("WebSocket server listening to port " + port);
  }

  /**
    * A client (web page) connects
    */
  commandStart() {
    console.log("Command start");
    this.recognizer = new speechToText.SpeechRecognizer();
  }

  commandAudio(buffer) {
    console.log("Command audio");
    this.recognizer.processAudio(buffer);
  }

  commandEnd() {
    console.log("Command end");
    let inputText = this.recognizer.end();
    this.recognizer = null;
    if (!inputText) {
      return;
    }
    (async () => {
      console.log("Command: " + inputText);
      let response = await this.intentParser.startApp(inputText);
      console.log("\n" + response + "\n");
      if (response) {
        //let readableSteam = await textToSpeech.textToSpeech(response);
      }
      return {
        inputText: inputText,
        responseText: response,
        responseSpeech: null,
      }
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

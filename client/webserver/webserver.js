//#!/usr/bin/env node
'use strict';

import { Client } from '../Client.js';
import { speechToText, textToSpeech } from '../../speech/speech.js';
import { fromWebsite } from '../connector/HTTPServer.js';
import http from 'http';
import express from 'express';

const port = 4224;

/**
 * This is the server part of a web client.
 * A web page records the audio from the microphone using the browser APIs.
 * The web page also does the wake word detection. Once a wake word is
 * recognized, the web page sends a streaming (!) request with the audio data.
 * We feed the audio data to the DeepSpeech recognizer as soon as it comes in.
 * Once the file upload is complete, we ask the recognizer for its translation.
 */
export class WebServer extends Client {
  async load() {
    await speechToText.load();
    await super.load();
  }

  async start() {
    await super.start();

    const app = express();
    const server = http.createServer(app);
    app.set("json spaces", 2);
    app.use(fromWebsite);
    app.options("/*");

    app.put("/speechToText", (request, response) => {
      console.log("Got SpeechToText request");

      response.json({
        input: "Grasshopper",
        response: "Hello world!",
      });
      return;
      // TODO "close" never called

      let recognizer = new speechToText.SpeechRecognizer();
      request.on("data", buffer => {
        console.log("Got data: ", buffer);
        recognizer.processAudio(buffer);
      });
      request.on("close", async () => {
        console.log("Got all data");
        let inputText = recognizer.end();
        console.log("Command: " + inputText);
        recognizer = null;
        try {
          let answer = await this.intentParser.startApp(inputText);
          console.log("\n" + answer + "\n");
          response.json({
            input: inputText,
            response: answer,
          });
        } catch (ex) {
          console.error(ex);
          response.status(404).json({
            errorMessage: ex.message || ex + "",
            type: ex.type,
          });
          return;
        }
      });
      request.on("error", ex => {
        console.error(ex);
        response.status(400).json({
          errorMessage: ex.message || ex + "",
        });
        recognizer = null;
      });
    });

    server.listen(port);
    console.log("Server listening to port " + port);
  }
}

(async () => {
  try {
    await new WebServer().start();
  } catch (ex) {
    console.error(ex);
  }
})();

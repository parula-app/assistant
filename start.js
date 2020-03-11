#!/usr/bin/env node
'use strict';

/**
 * This is the central code that calls all the other modules.
 */

import * as speechToText from './speechToText.js';
import * as textToSpeech from './textToSpeech.js';
import * as audioInOut from './audioInOut.js';
import IntentParser from './intentparser/match.js';
import MPD from './app/mpd/mpd.js';
import Bible from './app/bible/bible.js';
import { getConfig } from './util/config.js';

class Starter {
  constructor() {
    this.intentParser = null;
  }

  async load() {
    let lang = getConfig().language;

    await speechToText.load(lang);
    await textToSpeech.load(lang);
    await audioInOut.load();

    let Apps = [ MPD, Bible ]; // TODO dynamically

    let apps = Apps.map(App => new App());
    await Promise.all(apps.map(app =>
      app.load(lang)
    ));
    this.intentParser = new IntentParser();
    await this.intentParser.load(apps);
  }

  async start() {
    await this.load();
    let inputAudioBuffer = await audioInOut.audioInput();
    let inputText = await speechToText.speechToText(inputAudioBuffer);
    let response = await this.intentParser.startApp(inputText);
    console.log("\n" + response + "\n");
    await this.quit();
  }

  async quit() {
    await speechToText.unload();
    process.exit(0);
  }
}

(async () => {
  try {
    await new Starter().start();
  } catch (ex) {
    console.error(ex);
  }
})();

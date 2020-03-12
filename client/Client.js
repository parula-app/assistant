#!/usr/bin/env node
'use strict';

import * as speechToText from '../speechToText.js';
import * as textToSpeech from '../textToSpeech.js';
import IntentParser from '../intentparser/match.js';
import MPD from '../app/mpd/mpd.js';
import Bible from '../app/bible/bible.js';
import { getConfig } from '../util/config.js';

/**
 * This is the central code that calls all the other modules.
 *
 * This represents an application that listens to audio
 * input and responds.
 */
export class Client {
  constructor() {
    this.intentParser = null;
  }

  async load() {
    let lang = getConfig().language;

    await speechToText.load(lang);
    await textToSpeech.load(lang);

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
  }

  async quit() {
    await speechToText.unload();
    process.exit(0);
  }
}

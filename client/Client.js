#!/usr/bin/env node
'use strict';

import IntentParser from '../intentparser/match.js';
import { ClientAPI } from './ClientAPI.js';
import { getConfig } from '../util/config.js';
import * as speechToText from '../speechToText.js';
import * as textToSpeech from '../textToSpeech.js';
import Clock from '../app/clock/clock.js';
import PlayControl from '../app/playcontrol/playcontrol.js';
import MPD from '../app/mpd/mpd.js';
import Bible from '../app/bible/bible.js';

/**
 * This is the central code that calls all the other modules.
 *
 * This represents an application that listens to audio
 * input and responds.
 */
export class Client {
  constructor() {
    this.intentParser = null;
    this.lang = null;
  }

  async load() {
    let lang = this.lang = getConfig().language;

    await speechToText.load(lang);
    await textToSpeech.load(lang);

    let Apps = [ Clock, MPD, Bible, PlayControl ]; // TODO dynamically

    let apps = Apps.map(App => new App());
    await Promise.all(apps.map(app =>
      app.load(lang)
    ));
    let clientAPI = new ClientAPI(this);
    this.intentParser = new IntentParser(clientAPI);
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

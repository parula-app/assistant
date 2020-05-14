#!/usr/bin/env node
'use strict';

import IntentParser from '../intentparser/match.js';
import { ClientAPI } from './ClientAPI.js';
import { getConfig } from '../util/config.js';
import Clock from '../app/clock/clock.js';
import PlayControl from '../app/playcontrol/playcontrol.js';
import MPD from '../app/mpd/mpd.js';
import TuneIn from '../app/tunein/tunein.js';
import Hue from '../app/hue/hue.js';
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
    this.clientAPI = null;
    this.lang = null;
  }

  async load(lang) {
    let Apps = [ Clock, MPD, TuneIn, PlayControl, Hue, Bible ]; // TODO dynamically

    let apps = Apps.map(App => new App());
    await Promise.all(apps.map(app =>
      app.load(lang)
    ));
    this.clientAPI = new ClientAPI(this);
    this.intentParser = new IntentParser(this.clientAPI);
    await this.intentParser.load(apps);
  }

  async start() {
    this.lang = getConfig().language;
    await this.load(this.lang);
  }

  async unload() {
  }

  async quit() {
    await this.unload();
    process.exit(0);
  }

  get player() {
    throw new Error("Abstract function");
  }
}

#!/usr/bin/env node
'use strict';

import IntentParser from '../intentParser/IntentParser.js';
import { ClientAPI } from './ClientAPI.js';
import { getConfig } from '../util/config.js';
import Clock from '../app/clock/clock.js';
import TODOList from '../app/todolist/TODOList.js';
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

    process.once("SIGINT", async (exitCode) => {
      console.log("\nUser pressed Ctrl-C");
      await this.quit(exitCode);
    });

    process.once("SIGTERM", async (exitCode) => {
      console.log("kill received");
      await this.quit(exitCode);
    });
  }

  async load(lang) {
    let Apps = [ Clock, TODOList, MPD, TuneIn, PlayControl, Hue, Bible ]; // TODO dynamically

    let apps = Apps.map(App => new App());
    await Promise.all(apps.map(app =>
      app.load(lang)
    ));

    this.lang = lang;
    this.clientAPI = new ClientAPI(this);
    this.intentParser = new IntentParser(this.clientAPI);
    await this.intentParser.load(apps);
  }

  async start() {
    let lang = getConfig().language;
    await this.load(lang);
  }

  async unload() {
  }

  async quit(exitCode) {
    await this.unload();
    console.log("Exit");
    process.exit(exitCode);
  }

  get player() {
    throw new Error("Abstract function");
  }
}

#!/usr/bin/env node
'use strict';

import IntentParser from '../intentParser/IntentParser.js';
import { ClientAPI } from './ClientAPI.js';
import MetaLoader from '../baseapp/loader/MetaLoader.js';
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
    let apps = await (new MetaLoader()).findApps();
    await this.loadApps(apps, lang);
    this.lang = lang;
    this.clientAPI = new ClientAPI(this);
    this.intentParser = new IntentParser(this.clientAPI);
    await this.intentParser.load(apps);
  }

  async loadApps(apps, lang) {
    let results = await Promise.allSettled(apps.map(app =>
      app.load(lang)
    ));
    let i = 0;
    console.log("Applications loaded:");
    for (let app of apps) {
      let result = results[i++];
      let output = "success";
      if (result.status == "rejected") {
        let ex = result.reason;
        output = ex ? ex.message || ex : ex;
      }
      console.log("  " + app.id + ":", output);
    }
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

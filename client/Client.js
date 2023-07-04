//#!/usr/bin/env node
'use strict';

import IntentParser from '../intentParser/wildLeven/WildLevenIntentParser.js';
import { ClientAPI } from './ClientAPI.js';
import MetaLoader from '../baseapp/loader/MetaLoader.js';
import HTTPServer from './connector/HTTPServer.js';
import HTTPTextResponseServer from './connector/HTTPTextResponseServer.js';
import HTTPAppHub from '../baseapp/connector/httpapp/HTTPAppHub.js';
import WSAppHub from '../baseapp/connector/wsapp/WSAppHub.js';
import WSContextServer from './connector/WSContextServer.js';
import { getConfig } from '../util/config.js';

/**
 * This is the central code that calls all the other modules.
 *
 * This represents an application that listens to audio
 * input and responds.
 *
 * Client implementations are subclasses.
 */
export class Client {
  constructor() {
    this.clientAPI = new ClientAPI(this);
    this.intentParser = new IntentParser(this.clientAPI);
    this.lang = null;
    this.contextServer = null; /** {WSContextServer} */

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
    this.lang = lang;

    let apps = await (new MetaLoader()).findApps();
    await this.loadApps(apps, lang);
    await this.intentParser.loadApps(apps);

    this.contextServer = await new WSContextServer(this).start();
    let httpServer = await new HTTPServer(this).start();
    let expressApp = httpServer.expressApp;
    await new HTTPTextResponseServer(this, expressApp);
    await new HTTPAppHub(this, expressApp);
    await new WSAppHub(this).start();
  }

  async loadApps(apps, lang) {
    // Load all apps in parallel
    let results = await Promise.allSettled(apps.map(app =>
      app.load(lang)
    ));
    // Show stack for unexpected errors during app load
    for (let result of results.filter(result => result.status == "rejected")) {
      let ex = result.reason;
      if (!ex.doNotShow) {
        console.error(ex);
      }
    }
    // Show status for each app: succeeded or the error message
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

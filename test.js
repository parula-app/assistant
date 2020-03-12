#!/usr/bin/env node
'use strict';

import { Client } from './client/Client.js';

/**
 * Tests the intent parser and apps with a hardcoded string.
 */
class TestClient extends Client {
  async start() {
    await this.load();
    let inputText = "open genesis chapter five verse three";
    let response = await this.intentParser.startApp(inputText);
    console.log("\n" + response + "\n");
    await this.quit();
  }
}

(async () => {
  try {
    await new TestClient().start();
  } catch (ex) {
    console.error(ex);
  }
})();

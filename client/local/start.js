#!/usr/bin/env node
'use strict';

import { LocalClient } from './LocalClient.js';

(async () => {
  try {
    let client = new LocalClient()
    await client.start();
  } catch (ex) {
    console.error(ex);
  }
})();

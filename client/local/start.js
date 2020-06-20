#!/usr/bin/env node
'use strict';

import { LocalClient } from './LocalClient.js';
import { WSAppHub } from '../wsapp/WSAppHub.js';
import { HTTPAppHub } from '../httpapp/HTTPAppHub.js';

(async () => {
  try {
    let client = new LocalClient()
    await client.start();

    await new WSAppHub(client).start();
    await new HTTPAppHub(client).start();
  } catch (ex) {
    console.error(ex);
  }
})();

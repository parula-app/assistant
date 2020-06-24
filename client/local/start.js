#!/usr/bin/env node
'use strict';

import { LocalClient } from './LocalClient.js';
import { WSAppHub } from '../../baseapp/connector/wsapp/WSAppHub.js';
import { HTTPAppHub } from '../../baseapp/connector/httpapp/HTTPAppHub.js';

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

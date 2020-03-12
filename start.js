#!/usr/bin/env node
'use strict';

import { LocalClient } from './client/local/LocalClient.js';

(async () => {
  try {
    await new LocalClient().start();
  } catch (ex) {
    console.error(ex);
  }
})();

#!/usr/bin/env node
'use strict';

import { LocalClient } from './LocalClient.js';

(async () => {
  try {
    await new LocalClient().start();
  } catch (ex) {
    console.error(ex);
  }
})();

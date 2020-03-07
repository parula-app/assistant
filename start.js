#!/usr/bin/env node
'use strict';

/**
 * This is the central code that calls all the other modules.
 */

import * as speechToText from './speechToText.js';
import * as textToSpeech from './textToSpeech.js';
import * as audioInOut from './audioInOut.js';
import * as intentParser from './intentparser/match.js';
import * as mpd from './app/mpd/mpd.js';

async function load() {
  await speechToText.load();
  await textToSpeech.load();
  await audioInOut.load();

  let apps = [ mpd ]; // TODO dynamically

  for (let app of apps) {
    await app.load();
  }

  await intentParser.load(apps);
}

async function start() {
  await load();
  //let text = await speechToText.speechToText();
  let text = 'pretty woman by roy orberston';
  await intentParser.startApp(text);
}

start()
  .catch(ex => console.error(ex));

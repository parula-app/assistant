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

  await Promise.all(apps.map(app =>
    app.load()
  ));
  await intentParser.load(apps);
}

async function start() {
  await load();
  let inputAudioBuffer = await audioInOut.audioInput();
  let text = await speechToText.speechToText(inputAudioBuffer);
  await intentParser.startApp(text);
  await quit();
}

async function quit() {
  await speechToText.unload();
  process.exit(0);
}

start()
  .catch(ex => console.error(ex));

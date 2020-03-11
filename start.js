#!/usr/bin/env node
'use strict';

/**
 * This is the central code that calls all the other modules.
 */

import { configFile } from './util.js';
import * as speechToText from './speechToText.js';
import * as textToSpeech from './textToSpeech.js';
import * as audioInOut from './audioInOut.js';
import IntentParser from './intentparser/match.js';
import MPD from './app/mpd/mpd.js';
import Bible from './app/bible/bible.js';

var gIntentParser;

async function load() {
  await speechToText.load();
  await textToSpeech.load();
  await audioInOut.load();

  let Apps = [ MPD, Bible ]; // TODO dynamically

  let apps = Apps.map(App => new App());
  let lang = configFile().language;
  await Promise.all(apps.map(app =>
    app.load(lang)
  ));
  gIntentParser = new IntentParser();
  await gIntentParser.load(apps);
}

async function start() {
  await load();
  let inputAudioBuffer = await audioInOut.audioInput();
  let text = await speechToText.speechToText(inputAudioBuffer);
  let response = await gIntentParser.startApp(text);
  console.log("\n" + response + "\n");
  await quit();
}

async function quit() {
  await speechToText.unload();
  process.exit(0);
}

start()
  .catch(ex => console.error(ex));

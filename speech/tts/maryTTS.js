/**
 * Reads text into speech as audio stream.
 *
 * Based on MaryTTS <http://mary.dfki.de>
 * Assumes that MaryTTS was installed and is running locally.
 * Calls it via local web server.
 *
 * Demo: <http://localhost:59125> and <http://mary.dfki.de:59125>
 */

import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import { getConfig } from '../../util/config.js';

let gServerParams = {
  INPUT_TYPE: "TEXT",
  OUTPUT_TYPE: "AUDIO",
  AUDIO_OUT: "WAVE_FILE",
  AUDIO: "WAVE_FILE",
  LOCALE: "en_US",
  //VOICE set by pref config.maryTTS.voice
  // "cmu-slt" female, US
  // "cmu-rms" male, US
  // "dfki-spike" male, GB
  // "dfki-prudence" female, GB, posh
  VOICE: "cmu-slt-hsmm", // female, US, bad quality, default in source
};

export async function load(lang) {
  let config = getConfig().maryTTS;
  if (config.voice) {
    gServerParams.VOICE = config.voice;
  }

  let locale = lang;
  if (lang == "en") {
    locale = "en_GB";
  }
  gServerParams.LOCALE = locale;
}

export function audioProperties() {
  return {
    bits: 16,
    channels: 1,
    encoding: 'signed-integer',
    rate: 16000,
    type: 'wav',
  };
}

/**
 * @param text {string}   what to say
 * @returns {ReadableStream}   audio
 *   `.audio` {AudioProperties} the format type, sample rate etc. of the stream
 */
export async function textToSpeech(text) {
  // fixup
  text = text.replace(/\b([Ii]t)'s\b/g, "$1 is");
  let startTime = new Date();
  let config = getConfig().maryTTS;
  let url = config.url + '/process?' + new URLSearchParams(gServerParams).toString() +
    '&INPUT_TEXT=' + encodeURIComponent(text);
  let response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  let blob = await response.blob();
  console.info("Speech generation took " + ((new Date() - startTime) / 1000) + "s");
  //let waveURL = URL.createObjectURL(blob);
  //return await blob.arrayBuffer();
  let stream = blob.stream();
  stream.audio = audioProperties();
  return stream;
}

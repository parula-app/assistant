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

const kTTS_URL = "http://localhost:59125";
const kTTS_Bitrate = 48000;
let gServerParams = {
  INPUT_TYPE: "TEXT",
  OUTPUT_TYPE: "AUDIO",
  AUDIO_OUT: "WAVE_FILE",
  AUDIO: "WAVE_FILE",
  LOCALE: "en_US",
  //VOICE: "cmu-rms", // male, US, soft
  //VOICE: "dfki-spike", // male, GB
  //VOICE: "dfki-prudence", // female, GB, posh
  VOICE: "cmu-slt-hsmm", // female, US, bad quality, default voice in source
  // User overrides voice in config.maryTTS.voice
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

export function sampleRate() {
  return kTTS_Bitrate;
}

/**
 * @param text {string}   what to say
 * @returns {ReadableStream}   audio
 *    WAV format, sampleRate(), 1 channel, 16 bit
 */
export async function textToSpeech(text) {
  let startTime = new Date();
  let url = kTTS_URL + '/process?' + new URLSearchParams(gServerParams).toString() +
    '&INPUT_TEXT=' + encodeURIComponent(text);
  let response = await fetch(url, { cache: 'no-cache' })
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  let blob = await response.blob();
  console.info("Speech generation took " + ((new Date() - startTime) / 1000) + "s");
  //let waveURL = URL.createObjectURL(blob);
  //return await blob.arrayBuffer();
  return blob.stream();
}

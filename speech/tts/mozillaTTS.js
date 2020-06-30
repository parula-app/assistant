/**
 * Reads text into speech as audio stream.
 *
 * Based on Mozilla TTS and tacotron 1/2.
 * Calls it via local web server.
 */

import fetch from 'node-fetch';
import { getConfig } from '../../util/config.js';

export async function load(args) {
}

export function audioProperties() {
  return {
    bits: 16,
    channels: 1,
    encoding: 'signed-integer',
    rate: 22050,
    type: 'wav',
  };
}

/**
 * @param text {string}   what to say
 * @returns {ReadableStream}   audio
 *   `.audio` {AudioProperties} the format type, sample rate etc. of the stream
 */
export async function textToSpeech(text) {
  text = text.replace(/,/g, " ").replace(/'s/g, " is").replace(/\./g, " "); // fix Tacotron2
  let startTime = new Date();
  let url = getConfig().mozillaTTS.url;
  let response = await fetch(url + '/api/tts?text=' + encodeURIComponent(text), { cache: 'no-cache' })
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

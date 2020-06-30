import { soxRecord } from './sox.js';
import { getConfig } from '../../util/config.js';

export async function load(lang) {
}

/**
 * Listens to microphone, and returns the audio data.
 *
 * @params audioProperties {AudioProperties}  the desired format type, sample rate etc.
 * @returns {ReadableStream} audio data as stream
 *   Flows after this function returned.
 *   `.audio` {AudioProperties} the format type, sample rate etc. of the stream (same as `audioProperties`)
 */
export default function audioInput(audioProperties) {
  let config = getConfig().audio;
  let audioInputStream = soxRecord({
    device: config.inputDevice, // e.g. "hw:0,0", null = default
    driver: config.driver, // "pulse" or "alsa"
    output: audioProperties,
  });
  audioInputStream.audio = audioProperties;
  return audioInputStream;
}

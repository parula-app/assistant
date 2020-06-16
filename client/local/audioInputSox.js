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
  let device = getConfig().audio.inputDevice;
  let audioInputStream = soxRecord({
    device: device,
    output: audioProperties,
  });
  audioInputStream.audio = audioProperties;
  return audioInputStream;
}

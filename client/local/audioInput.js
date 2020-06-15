import { soxRecord } from './sox.js';
import { speechToText } from '../../speech/speech.js'; // sample rate
import { getConfig } from '../../util/config.js';

export async function load(lang) {
}

/**
 * Listens to microphone, and returns the audio data.
 *
 * @returns {ReadableStream} audio data as stream
 *   Flows after this function returned.
 */
export default function audioInput() {
  let device = getConfig().audio.inputDevice;
  let audioInputStream = soxRecord({
    device: device,
    output: {
      bits: 16,
      channels: 1,
      encoding: 'signed-integer',
      rate: speechToText.sampleRate(),
      type: "raw",
    },
  });
  return audioInputStream;
}

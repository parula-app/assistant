import mic from 'mic'; // for input -- output doesn't work for me
import { speechToText } from '../../speech/speech.js'; // sample rate
import { getConfig } from '../../util/config.js';

export async function load() {
}

/**
 * Listens to microphone, and returns the audio data.
 *
 * @returns {ReadableStream} audio data as stream
 *   Flows after this function returned.
 */
export default function audioInput() {
  console.log("Using microphone at device", getConfig().audio.inputDevice || "(default)");
  let m = mic({
    channels: 1,
    bitwidth: 16,
    encoding: "signed-integer",
    rate: speechToText.sampleRate(),
    device: getConfig().audio.inputDevice || "default", // e.g. "hw:0,0"
  });
  let audioInputStream = m.getAudioStream();
  m.start();
  return audioInputStream;
}

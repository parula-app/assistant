import AudioRecorder from 'node-audiorecorder';
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
  let audioRecorder = new AudioRecorder({
    program: "sox", // "sox", "arecord" or "rec"
    channels: 1,
    bits: 16,
    rate: speechToText.sampleRate(),
    format: "S16_LE", // arecord only
    encoding: "signed-integer", // sox only
    endian: "little",
    device: getConfig().audio.inputDevice, // arecord only
    type: "raw",
    silence: 0,
  }, console);
  audioRecorder.start();
  return audioRecorder.stream();
}

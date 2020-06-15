import { soxPlay } from './sox.js';
import { textToSpeech } from '../../speech/speech.js'; // sample rate
import { getConfig } from '../../util/config.js';

export async function load(lang) {
}

/**
 * Play sound at the loudspeakers.
 *
 * @param audioStream {ReadableStream} audio
 *    WAV format, outputSampleRate(), 1 channel, 16 bit unsigned
 */
export default async function audioOutput(audioStream) {
  let device = getConfig().audio.outputDevice; // e.g. "hw:0,0", null = default
  // TODO Gives "Failed to open output device" for me for "hw:0,0", despite matching the docs.
  let ao = soxPlay({
    device: device,
    input: {
        type: "wav",
    },
  });
  await new Promise((resolve, reject) => {
    audioStream.pipe(ao)
      .on('finish', resolve);
  });
}

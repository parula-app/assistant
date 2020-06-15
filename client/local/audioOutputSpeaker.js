import Speaker from 'speaker'; // for output -- naudiodon output doesn't work for me
import { textToSpeech } from '../../speech/speech.js'; // sample rate
import { getConfig } from '../../util/config.js';

/**
 * Play sound at the loudspeakers.
 *
 * @param audioStream {ReadableStream} audio
 *    RAW format, outputSampleRate(), 1 channel, 16 bit unsigned
 */
export default function audioOutput(audioStream) {
  let device = getConfig().audio.outputDevice; // e.g. "hw:0,0", null = default
  // TODO Gives "Failed to open output device" for me for "hw:0,0", despite matching the docs.
  let ao = new Speaker({
    channels: 1,
    bitDepth: 16,
    sampleRate: textToSpeech.sampleRate(),
    device: device,
  });
  return new Promise((resolve, reject) => {
    audioStream.pipe(ao)
      .on('finish', resolve);
  });
}

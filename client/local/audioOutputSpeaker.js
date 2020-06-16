import Speaker from 'speaker'; // for output -- naudiodon output doesn't work for me
import { getConfig } from '../../util/config.js';

/**
 * Play sound at the loudspeakers.
 *
 * @param audioStream {ReadableStream} audio
 *    `.audio` {AudioProperties} must contain the format type, sample rate etc.
 */
export default function audioOutput(audioStream) {
  let device = getConfig().audio.outputDevice; // e.g. "hw:0,0", null = default
  // TODO Gives "Failed to open output device" for me for "hw:0,0", despite matching the docs.
  let ao = new Speaker({
    channels: audioStream.audio.channels,
    bitDepth: audioStream.audio.bits,
    sampleRate: audioStream.audio.rate,
    device: device,
  });
  return new Promise((resolve, reject) => {
    audioStream.pipe(ao)
      .on('finish', resolve);
  });
}

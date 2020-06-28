/**
 * Reads and writes from audio files.
 * This is for debugging.
 */

import fs from 'fs';
//import SoxCommand from 'sox-audio';

let counter = 0;

/**
 * @param audioStream {ReadableStream} audio
 *    `.audio` {AudioProperties} must contain the format type, sample rate etc.
 */
export function saveAudioFile(audioStream) {
  let sox = SoxCommand();
  sox.input(audioStream)
    .inputSampleRate(audioStream.rate)
    .inputEncoding(audioStream.encoding.replace("-integer", "")) // e.g. "signed"
    .inputBits(audioStream.bits)
    .inputChannels(audioStream.channels)
    .inputFileType(audioStream.type);
  let fileWriteStream = fs.createWriteStream("./command" + ++counter + ".wav");
  sox.output(fileWriteStream)
    .outputSampleRate(48000)
    .outputEncoding('signed')
    .outputBits(16)
    .outputChannels(1)
    .outputFileType('wav');
    audioStream.pipe(fileWriteStream);
  return new Promise((resolve, reject) => {
    audioStream.on('end', resolve);
  });
}

/**
 * Return a WAVE file as audio stream.
 *
 * @param waveFilename {string} filename, relative to project root
 * @returns audioStream {ReadableStream} audio
 *    `.audio` {AudioProperties} must contain the format type, sample rate etc.
 */
export function waveFile(waveFilename) {
  let waveStream = fs.createReadStream(waveFilename);
  waveStream.audio = {
    type: "wav",
  };
  return waveStream;
}

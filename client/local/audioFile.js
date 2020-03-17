/**
 * Reads and writes from audio files.
 * This is for debugging.
 */

import { sampleRate as inputSampleRate } from '../../speechToText.js';
import { sampleRate as outputSampleRate } from '../../textToSpeech.js';
import * as fs from 'fs';
import SoxCommand from 'sox-audio';

let counter = 0;

export function saveAudioFile(audioStream) {
  let sox = SoxCommand();
  sox.input(audioStream)
    .inputSampleRate(inputSampleRate())
    .inputEncoding('signed')
    .inputBits(16)
    .inputChannels(1)
    .inputFileType('raw');
  let fileWriteStream = fs.createWriteStream("./command" + ++counter + ".wav");
  sox.output(fileWriteStream)
    .outputSampleRate(44100)
    .outputEncoding('signed')
    .outputBits(16)
    .outputChannels(1)
    .outputFileType('wav');
    audioStream.pipe(fileWriteStream);
  return new Promise((resolve, reject) => {
    audioStream.on('finish', resolve);
  });
}

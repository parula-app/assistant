/**
 * Reads and writes from audio files.
 * This is for debugging.
 */

import * as fs from 'fs';
import SoxCommand from 'sox-audio';
import { speechToText, textToSpeech } from '../../speech/speech.js'; // sample rate

let counter = 0;

export function saveAudioFile(audioStream) {
  let sox = SoxCommand();
  sox.input(audioStream)
    .inputSampleRate(speechToText.sampleRate())
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
    audioStream.on('end', resolve);
  });
}

import { PassThrough } from 'stream';
import { sox } from '../../client/local/sox.js';
import { assert } from '../../util/util.js';

var gTextToSpeechModule;

export async function load(lang, textToSpeechModule) {
  gTextToSpeechModule = textToSpeechModule;
  await gTextToSpeechModule.load(lang);
}

export function sampleRate() {
  assert(gTextToSpeechModule && gTextToSpeechModule.sampleRate, "Parallel TTS load() not yet called");
  return gTextToSpeechModule.sampleRate();
}

/**
 * Splits the text into sentences, feeds all sentences
 * to TTS in parallel (to saturate the CPU cores even with a single core TTS engine)
 * and then waits for each sentence in sequence and plays them
 * back in order.
 * @returns {ReadableStream}   audio
 *    RAW format, sampleRate(), 1 channel, 16 bit
 */
export async function textToSpeech(fullText) {
  let phrases = splitPhrases(fullText);
  // start TTS, for all phrases in parallel
  let ttsPromises = phrases.map(gTextToSpeechModule.textToSpeech);

  let mergedStream = new PassThrough();

  (async () => { // run after returning the output stream
    for (let ttsPromise of ttsPromises) {
      let { inputWritableStream, outputReadableStream } = sox({
        input: {
          type: 'wav',
        },
        output: {
          bits: 16,
          channels: 1,
          encoding: 'signed-integer',
          rate: sampleRate(),
          type: 'raw',
        },
      });
      outputReadableStream.pipe(mergedStream, { end: false });
      let waveStream = await ttsPromise; // waits for the TTS
      waveStream.pipe(inputWritableStream);
      await new Promise(resolve => { // waits to finish playing
        outputReadableStream.on("end", resolve);
      });
    }
    mergedStream.end();
  })();

  return mergedStream;
}

/**
 * Splits a long string with a whole paragraph or document
 * into shorter strings.
 * Splits as sentence boundaries, any possibly also at ; or , and similar.
 * @param fullText {string}  a sentence, paragraph or document
 * @returns {Array of string} shorter strings, usually one string per sentence.
 *   If fullText is already a single sentence, returns the same as fullText (no-op)
 */
export function splitPhrases(fullText) {
  return fullText.match(/\w.*?(\W\s|$)/g);
}

import * as _speechToText from './recognition/deepSpeech.js';
import * as _textToSpeech from './tts/maryTTS.js';
import * as _wakeword from './wakeword/bumblebee.js';

export const speechToText = _speechToText;
export const textToSpeech = _textToSpeech;
export const wakeword = _wakeword;

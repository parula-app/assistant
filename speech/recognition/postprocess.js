import * as wtn from 'words-to-numbers';
const wordsToNumbers = wtn.default.wordsToNumbers;

export function textPostProcess(text) {
  text = wordsToNumbers(text) + ""; // leaves text as-is, only replaces numbers
  return text;
}

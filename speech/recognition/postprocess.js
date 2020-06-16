import * as wtn from 'words-to-numbers';
const wordsToNumbers = wtn.default.wordsToNumbers;

export function textPostProcess(text) {
  text = wordsToNumbers(text) + ""; // leaves text as-is, only replaces numbers
  return text;
}

/**
 * @param text {string} e.g. "r r r foo bar"
 * @returns  {string} e.g. "rrr foo bar"
 */
function undoSpellAsLetters(text) {
  let result = "";
  let inSpelling = false;
  for (let i = 0; i < text.length; i++) {
    if (text[i] == " " && // if " r ", whereas i is on the starting space
        text.length > i + 1 && isLetter(text[i + 1]) &&
        (text.length == i + 2 || text[i + 2] == " ")) {
      if (inSpelling) {
        // skip
      } else {
        result += text[i];
        inSpelling = true;
      }
    } else {
      result += text[i];
      inSpelling = false;
    }
  }
  return result;
}

function isLetter(letter) {
  return letter.toUpperCase() != letter.toLowerCase();
}

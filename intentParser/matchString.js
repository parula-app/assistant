import wildLeven from './leven.js';

/**
 * Find the closest match of the inputText within validValues.
 * Return one of validValues or nothing.
 *
 * @param inputText {string} user input, only the part for this variable
 * @param validValues {Array of string}
 * @returns {wildLeven() result} the closest match
 *    or null, if the strings are too far.
 */
export function matchString(inputText, validValues) {
  return matchStringWithAlternatives(inputText, validValues)[0];
}

/**
 * Find the best matches of the inputText within validValues.
 *
 * @param inputText {string} user input, only the part for this variable
 * @param validValues {Array of string}
 * @returns {Array of wildLeven() result} the closest matches,
 *    sorted by decreasing order of match
 *    May be an empty array, if the strings are too far.
 */
export function matchStringWithAlternatives(inputText, validValues) {
  if (!validValues || !validValues.length) {
    //throw new Error("Need valid values to match against");
    return [];
  }
  inputText = inputText.toLowerCase();
  const kMaxScore = 0.7; // If we need to change more than half the chars, then don't take it
  let startTime = new Date();
  let results = validValues
    .map(targetString => {
      if (!targetString) { // invalid entries in validValues
        return { score: kMaxScore * 2 }; // filter it out below
      }
      let result = wildLeven(inputText, targetString.toLowerCase());
      result.targetString = targetString; // not lower case
      return result;
    })
    .filter(result => result.score <= kMaxScore)
    .sort((a, b) => a.score - b.score);
  //for (let result of results.slice(0, 20)) {
  //  console.log(result.targetString, result.editDistance, result.score);
  //}
  if (!results.length) {
    return [];
  }
  console.log("did you mean (" + (new Date() - startTime) + "ms):", results[0].targetString);
  return results;
}

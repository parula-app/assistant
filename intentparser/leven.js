/**
  * Levenshtein distance with named wildcards
  *
  * Returns the edit distance between an input string and a target string.
  * The target string may contain variables which are extracted from the input.
  *
  * @param s {String} String to match
  * @param p {String} Pattern with named wildcards
  * @returns {
  *   editDistance {int} levenshtein distance
  *   score {float} distance / target string length (without placeholders)
  *   variables: {
  *     <placeholderName> {string}: <corresponding value from inputString> {str
ing}
  *   }
  */
export default function wildLeven(inputString, targetString) {
  const kDeleteCost = 1;
  const kReplaceCost = 1;
  const kInsertCost = 0.5;
  const kVariableInsertCost = 0;
  /// These constants are used to retrace the path for the shortest edit.
  const INSERT = 1, EDIT = 0, DELETE = -1;
  /// The pattern, split into an array of characters and variables.
  let targetPattern = targetString.match(/{\w+}|./g);
  /// A 2D array of the path taken at each potential edit.
  let fullPath = [];
  /// The edit distance. Starts off as the length of the input,
  /// but is recalculated for each element of the pattern.
  let distance = inputString.length;
  /// An array of character codes of the input. Codes compare more quickly.
  let inputChars = [];
  /// An array of edit distances for the prefixes of the input string.
  /// These distances are carried forward to the next pass of the pattern loop.
  let lastDistances = [];
  // Initialise the array of character codes and last distances.
  for (let j = 0; j < distance; j++) {
    inputChars[j] = inputString.charCodeAt(j);
    lastDistances[j] = (j + 1) * kInsertCost;
  }
  // As we take each entry of the target pattern into account,
  // all the edit distances for the input string prefixes are recalculated.
  for (let i = 0; i < targetPattern.length; i++) {
    // NOTE: This assumes that the variable marker cannot appear in the input.
    let patternChar = targetPattern[i].charCodeAt(0);
    let isPlaceholder = targetPattern[i].length > 1;
    // Optimal insert costs were determined by running on a test suite.
    let insertCost = isPlaceholder ? kVariableInsertCost : kInsertCost;
    // Start with the distance costs for an empty input string.
    let lastDistance = i * kDeleteCost;
    distance = lastDistance + kDeleteCost;
    // Keep track of the path used to track the current distance.
    let path = [];
    // Now take each character of the input string into account.
    for (let j = 0; j < inputString.length; j++) {
      // Calculate the costs of the various potential operations.
      let editDistance = lastDistance + (patternChar != inputChars[j]) * kReplaceCost;
      let insertDistance = distance + insertCost;
      // Save the value for the next pass of the inner loop.
      lastDistance = lastDistances[j];
      let deleteDistance = lastDistance + kDeleteCost;
      // Decide which operation is the cheapest and save it in the path.
      if (editDistance <= insertDistance && editDistance <= deleteDistance) {
        distance = editDistance;
        path.push(EDIT);
      } else if (insertDistance <= deleteDistance) {
        distance = insertDistance;
        path.push(INSERT);
      } else {
        distance = deleteDistance;
        path.push(DELETE);
      }
      // Save the value for the next pass of the outer loop.
      lastDistances[j] = distance;
    }
    // Save this pattern entry's paths.
    fullPath.push(path);
  }
  // Start building up the result.
  let result = {
    editDistance: distance,
    score: distance / targetPattern.length,
    variables: {}, // filled below
  };
  let end = inputString.length;
  // Trace the path back from the end to an empty string.
  for (let i = targetPattern.length, j = inputString.length; i-- && j--; ) {
    switch (fullPath[i][j]) {
    case DELETE:
      j++;
      break;
    case INSERT:
      i++;
      break;
    default:
      // This is the beginning of a pattern variable, so save it in the result.
      if (targetPattern[i].length > 1) {
        result.variables[targetPattern[i].slice(1, -1)] = inputString.slice(j, end);
      }
      // This is the end of a pattern variable, so save the position for later.
      if (i && targetPattern[i - 1].length > 1) {
        end = j;
      }
      break;
    }
  }
  return result;
}

/**
 * Returns the edit distance between an input string and a target string.
 * The target string's words may contain alternative markers `|`.
 * In this case both alternatives will be checked and the lowest chosen.
 * Multiple words can have alternatives if necessary, however each word
 * should only have two alternatives for optimal performance.
 */
export function altlev(inputString, targetString) {
  // No alternatives left to process.
  if (!/\w+\|\w+/.test(targetString)) {
    return wildLeven(inputString, targetString);
  }
  // Calculate each alternative separately and return the lowest distance.
  let first = altlev(inputString, targetString.replace(/\|\w+/, ""));
  let second = altlev(inputString, targetString.replace(/\w+\|/, ""));
  return second.score < first.score ? second : first;
}

/**
 * Test a string against a number of patterns and return the best result
 * plus the pattern which gave that result.
 */
export function bestmatch(inputString, targetStrings) {
  let best = { score: Infinity };
  for (let targetString of targetStrings) {
    let result = altlev(inputString, targetString);
    if (result && result.score < best.score) {
      best = result;
    }
  }
  return best;
}

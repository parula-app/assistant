let count = 0; // for timing only
/**
 * Returns the edit distance between an input string and a target string.
 * The target string may contain variables which are extracted from the input.
 * The distance is costed such that variables count 0.875 while other inserted
 * characters cost 1 and other edits and deletions cost 2.
 */
export default function lev(inputString, targetString) {
  count++; // for timing only
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
    lastDistances[j] = j + 1;
  }
  // As we take each entry of the target pattern into account,
  // all the edit distances for the input string prefixes are recalculated.
  for (let i = 0; i < targetPattern.length; i++) {
    // NOTE: This assumes that the variable marker cannot appear in the input.
    let patternChar = targetPattern[i].charCodeAt(0);
    // Optimal insert costs were determined by running on a test suite.
    let insertCost = targetPattern[i].length > 1 ? 0.875 : 1;
    // Start with the distance costs for an empty input string.
    let lastDistance = i + i;
    distance = lastDistance + 2;
    // Keep track of the path used to track the current distance.
    let path = [];
    // Now take each character of the input string into account.
    for (let j = 0; j < inputString.length; j++) {
      // Calculate the costs of the various potential operations.
      let editDistance = lastDistance + (patternChar != inputChars[j]) * 2;
      let insertDistance = distance + insertCost;
      // Save the value for the next pass of the inner loop.
      lastDistance = lastDistances[j];
      let deleteDistance = lastDistance + 2;
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
  let result = { distance };
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
        result[targetPattern[i].slice(1, -1)] = inputString.slice(j, end);
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
function altlev(inputString, targetString) {
  // No alternatives left to process.
  if (!/\w+\|\w+/.test(targetString)) return lev(inputString, targetString);
  // Calculate each alternative separately and return the lowest distance.
  let first = altlev(inputString, targetString.replace(/\|\w+/, ""));
  let second = altlev(inputString, targetString.replace(/\w+\|/, ""));
  return second.distance < first.distance ? second : first;
}

/**
 * Test a string against a number of patterns and return the best result
 * plus the pattern which gave that result.
 */
var debug = false;
function match(inputString, targetStrings) {
  let best = { distance: Infinity };
  for (let targetString of targetStrings) {
    let result = altlev(inputString, targetString);
    if (debug) console.log(result);
    if (result && result.distance < best.distance) {
      best = result;
      best.pattern = targetString;
    }
  }
  if (debug) console.log("Best match for", inputString, "was", best.pattern);
  if (debug) console.log(best);
  return best;
}

/// Array of [pattern, representative input string] entries.
var tests = [
  ["search {search}", "surge speech recognition"],
  ["search for {search}", "church four miles"],
  ["search google for {search}", "merge googol four zeroes"],
  ["search {search} at google", "perch jobs at google"],
  ["what time is it", "what thyme is it"],
  ["what time is it in {place}", "watt time is it in france"],
  //["what time is it in * on my *", ""], // I don't know what these mean
  //["on my * what time is it in *", ""],
  ["set|put alarm to|at {time}", "set alarm two eight tomorrow"],
  ["wake me up at {time}", "quake me up at eight tomorrow"],
  ["ring the alarm at {time}", "wring the alarm at eight tomorrow"],
  ["set|put alarm to|at {time} with {music}", "set alarm two eight tomorrow with radio five live"],
  ["wake me up at {time} with {music}", "quake me up at eight tomorrow with radio five live"],
  ["rate this restaurant with {number} stars", "arrayed this restaurant width four stars"],
  ["recommend me a restaurant like {name} in {place}", "reckoned me a restaurant alike mcdonalds in rutland"],
  ["how old is {person}", "who old is kneel"],
  ["how old was {person} in {movie}", "how old was tom cruise in top gun"],
  ["in which movies did {person} play", "in which movies did shirley henderson plain"],
  ["who played {person} in {movie}", "who plaid moaning myrtle in harry potter"],
  ["how many movies did {person} make|play", "how many movies did tom cruise ache"],
  ["who is|was {person}", "who was lenin"],
  ["what is {concept}", "what is the capital of france"],
  ["who owns {object}", "who owns apple"],
  ["play songs|music from|by {author}", "plain music by beethoven"],
  ["play the song {name} from|by {author}", "please plain the song not that kind from an a stadion"],
  ["play the song {name}", "please plain the song not that kind for me"],
  ["play {name}", "plain an a stadion"],
  ["{name}", "how much is that doggy in the window"],
];

/*
// Avoid timing lazy compilation by performing a test up-front.
console.log(altlev("reckoned me a restaurant alike mcdonalds in rutland", "recommend me a restaurant like {name} in {place}"));
let now = Date.now();
for (let i = 0; i < 1000; i++) {
  for (let test of tests) {
    for (let pattern of tests) {
      altlev(test[1], pattern[0]);
    }
  }
}
console.log((Date.now() - now) / count + " ms");
*/

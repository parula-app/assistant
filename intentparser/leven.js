/**
  * Levenshtein distance with named wildcards
  *
  * @param s {String} String to match
  * @param p {String} Pattern with named wildcards
  * @returns {
  *   targetString {string}
  *   editDistance {int} levenshtein distance
  *   variables: {
  *     <placeholderName> {string}: <corresponding value from inputString> {string}
  *   }
  */
export default function wildLeven(inputString, targetString) {
  if (!targetString) {
    return {
      targetString: "",
      editDistance: inputString.length * 2,
    };
  }
  // Split the target string into wildcards and characters.
  let p = targetString.match(/{\w+}|./g);
  /// Array of strings (i.e. 2D array of characters) indicating the edits chosen.
  let operations = ["i".repeat(inputString.length + 1)];
  /// Current Levenshtein distance.
  let curDistance = inputString.length;
  /// Array of Levenshtein distances for the string so far for the current pattern character.
  let distances = [];
  // For an empty pattern, the prefix edit distances are simply the number of characters to delete.
  for (let j = 0; j < curDistance; j++) {
    distances[j] = j + 1;
  }
  // Now loop over each pattern, recalculating the edit distances for each string prefix.
  for (let i = 0; i < p.length; i++) {
    // Is this a wildcard?
    let wild = p[i].length > 1;
    // Initial potential edit cost is the previous pattern length.
    let last = i;
    // Initial distance is the pattern length including the current character.
    curDistance = i + 1;
    // Initial operation is to delete patten characters to achieve an empty string.
    operations[i + 1] = "d";
    // Now consider each character of the string so far to see how it affects the edit distance.
    for (let j = 0; j < inputString.length; j++) {
      // Is this a match?
      let same = p[i] == inputString[j];
      // Calculate the cost of an edit.
      // TODO adding a boolean to an int
      let edit = last + !same;
      // Calculate the cost of inserting this character.
      let ins = curDistance + !wild;
      // Save the potential edit cost for the next pass of the loop.
      last = distances[j];
      // Calculate the cost of deleting the pattern character.
      let del = last + 1;
      // Find the winning operation.
      if (edit <= ins && edit <= del) {
        curDistance = edit;
        operations[i + 1] += same ? "s" : "e";
      } else if (ins <= del) {
        curDistance = ins;
        operations[i + 1] += "i";
      } else {
        curDistance = del;
        operations[i + 1] += "d";
      }
      // Save the edit costs for the next pattern character loop.
      distances[j] = curDistance;
    }
  }
  // We have a winner. Work back to see where our wildcards matched.
  let result = {
    targetString: targetString,
    editDistance: curDistance,
    variables: {},
  };
  // Captures start and end index of each variable in the input string.
  // Property name is the variable name.
  let variableStartPos = {};
  let variableEndPos = {};
  for (let i = p.length, j = inputString.length; i || j; ) {
    switch (operations[i][j]) {
    case "d":
      i--;
      break;
    case "i":
      j--;
      break;
    default:
      i--;
      j--;
      if (p[i].length > 1) {
        variableStartPos[p[i].slice(1, -1)] = j;
      }
      if (i && p[i - 1].length > 1) {
        variableEndPos[p[i - 1].slice(1, -1)] = j;
      }
      break;
    }
  }
  for (let placeholderName in variableStartPos) {
    result.variables[placeholderName] = inputString.slice(
      variableStartPos[placeholderName],
      variableEndPos[placeholderName] || inputString.length);
  }
  result.editDistance += Object.values(result.variables).reduce((acc, value) => acc + value.length, 0) / 2;
  return result;
}

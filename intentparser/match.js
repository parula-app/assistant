//import stringSimilarity from 'string-similarity';
import didYouMean2 from 'didyoumean2';

var validInput = null;

export async function load() {
  await loadValidInputFromFile(args);
}

/*
export async function load() {
  await loadValidInputFromFile(args);
}

async function loadValidInputFromFile(args) {
  if (!args['valid_input']) {
    return;
  }
  let startTime = new Date();
  console.info('Loading valid input from file %s', args['valid_input']);
  validInput = fs.readFileSync(args['valid_input'], 'utf8').split('\n');
  console.info('Read %d lines in %dms', validInput.length, new Date() - startTime);
}

function commandlineArgs() {
  var parser = new argparse.ArgumentParser({addHelp: true, description: 'Pia'});
  parser.addArgument(['--valid_input'], {help: 'File with all possible inputs, one per line. The recognition result text will be one line from this file.', nargs: '?'});
}
*/

/**
 * @param lines {Array of string} each entry is a one valid input
 */
function addValidInput(lines) {
  validInput = validInput.concat(lines);
}

/**
 * @param inputText {string}
 * @returns {string} one line from validInput, the closest match
 */
export function matchValid(inputText) {
  if (!validInput) {
    return inputText;
  }
  //let similarity = stringSimilarity.findBestMatch(inputText, validInput).bestMatch.target;
  //console.log("stringSimilarity:", similarity);
  const startTime = new Date();
  let match = didYouMean2(inputText, validInput);
  console.log("didyoumean2:", match);
  console.log("string matching took", (new Date() - startTime) + "ms");
  return match;
}

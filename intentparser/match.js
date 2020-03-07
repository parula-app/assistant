/**
 * Intent parser
 *
 * Accepts a string from speech input,
 * and selects the right app, command and variables,
 * based on the valid input possibilities of each app.
 */

//import stringSimilarity from 'string-similarity';
import didYouMean2 from 'didyoumean2';

var gApps;

export async function load(apps) {
  gApps = apps;
}

export function matchApp(inputText) {
  // TODO match against commands of each app
  let app = gApps[0];
  let command = "playMusic";
  let params = {
    song: inputText, // TODO only the variable text
  }

  for (let name in params) {
    params[name] = matchVariable(params[name], app.validVariableValues(name));
  }
  app[command](params);
}

/**
 * @param inputText {string} user input, only the part for this variable
 * @param validValues {Array of string}
 * @returns {string} one line from validValues, the closest match
 */
function matchVariable(inputText, validValues) {
  if (!validValues) {
    return inputText;
  }
  //let similarity = stringSimilarity.findBestMatch(inputText, validValues).bestMatch.target;
  //console.log("stringSimilarity:", similarity);
  const startTime = new Date();
  let match = didYouMean2(inputText, validValues);
  console.log("didyoumean2:", match);
  console.log("string matching took", (new Date() - startTime) + "ms");
  return match;
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

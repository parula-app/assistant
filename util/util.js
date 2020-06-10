import fs from 'fs';

/**
 * @param test {boolean}
 * @param errorMsg {string}
 */
export function assert(test, errorMsg) {
  if (!test) {
    throw new Error(errorMsg || "Assertion failed");
  }
}

/**
 * async setTimeout()
 */
export async function wait(seconds) {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        resolve();
      } catch (ex) {
        reject(ex);
      }
    }, seconds * 1000);
  });
}

/**
 * Returns contents of file as JSON.
 *
 * @param filePath {string} path relative to project root
 * @returns {JSON}
 */
export function loadJSONFile(filePath) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (ex) {
      console.error("JSON syntax error in file " + filePath + " : " + ex.message);
      throw ex;
    }
}

/**
 * @param {integer} num - The number to round
 * @param {integer} leadingDigits - How many significant digits at the start to keep
 * @returns {integer} rounded num
 */
export function round(num, leadingDigits) {
  let precision = Math.pow(10, num.toString().length - leadingDigits);
  return Math.round(num / precision) * precision;
}

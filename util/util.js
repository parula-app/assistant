import argparse from 'argparse';
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

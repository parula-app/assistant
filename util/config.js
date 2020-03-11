import argparse from 'argparse';
import fs from 'fs';
import { loadJSONFile, assert } from './util.js';

var configData;

export function getConfig() {
  if (configData) {
    return configData;
  }
  configData = loadJSONFile('./config.json');
  console.info("configuration file:\n" + JSON.stringify(configData, null, 4));
  let defaults = loadJSONFile('./config-defaults.json');
  //console.info("defaults:\n" + JSON.stringify(defaults, null, 4));
  configData = jsonMerge(defaults, configData);
  let commandline = commandlineArgs(configData);
  //console.info("commandline and defaults:\n" + JSON.stringify(commandline, null, 4));
  configData = jsonMerge(configData, commandline);
  console.info("Starting with configuration:\n" + JSON.stringify(configData, null, 4));
  return configData;
}

/**
 * Allows the user to override config file values using the command line.
 *
 * @param currentConfig {JSON} contents of the configuration file
 * @returns {JSON} similar to `config`, but the user overrides from the command line
 */
export function commandlineArgs(currentConfig) {
  var parser = new argparse.ArgumentParser({addHelp: true, description: 'Pia'});
  var help = jsonFlat(loadJSONFile('./config-help.json'));
  var currentFlat = jsonFlat(currentConfig, ".");
  for (let paramName in currentFlat) {
    let currentValue = currentFlat[paramName];
    let type;
    if (typeof(currentValue) == "number") {
      if (currentValue == parseInt(currentValue + "")) {
        type = "int";
      } else {
        type = "float";
      }
    }
    parser.addArgument(['--' + paramName], {
      defaultValue: currentValue,
      help: help[paramName],
      type: type,
    });
  }
  let commandline = parser.parseArgs();
  return jsonUnflat(commandline);
}

/**
 * Returns the whole hierarchy as flat list.
 * @param json {JSON}
 *    E.g. {
 *     "audio": {
 *       "inputDevice": 7,
 *     },
 *     "language": en,
 *   }
 * @param separator {string} (optional) default "."
 * @param prefix {string} (optional) internal, for recursion
 * @param result {obj} (optional) internal, for recursion
 * @returns {JS obj: path {string} -> value {any} }
 *    E.g. {
 *     "audio.inputDevice": 7,
 *     "language": en,
 *   }
 */
function jsonFlat(json, separator, prefix, result) {
  separator = separator || ".";
  prefix = prefix || "";
  result = result || {};
  for (let propertyName in json) {
    let value = json[propertyName];
    if (typeof(value) == "object") {
      jsonFlat(value, separator, prefix + propertyName + separator, result);
    } else {
      result[prefix + propertyName] = value;
    }
  }
  return result;
}

/**
 * Opposite of jsonFlat()
 * @param flat {JS obj: path {string} -> value {any} }
 *    E.g. {
 *     "audio.inputDevice": 7,
 *     "language": en,
 *   }
 * @returns {JSON}
 *    E.g. {
 *     "audio": {
 *       "inputDevice": 7,
 *     },
 *     "language": en,
 *   }
 *
 * @test JSON.stringify(data) == JSON.stringify(jsonUnflat(jsonFlat(data)))
 */
function jsonUnflat(flat, separator) {
  separator = separator || ".";
  let result = {};
  for (let propertyName in flat) {
    let value = flat[propertyName];
    let branches = propertyName.split(separator);
    let obj = result;
    for (let i = 0; i < branches.length; i++) {
      let branch = branches[i];
      if (i < branches.length - 1) {
        if (!obj[branch]) {
          obj[branch] = {};
        }
        obj = obj[branch];
      } else { // leaf
        obj[branch] = value;
      }
    }
  }
  return result;
}

/**
 * Merges all properties of `add` into `base`.
 * Hierarchical, i.e. including nesting.
 *
 * @param base {JSON}
 * @param add {JSON}
 * @returns {JSON}
 */
function jsonMerge(base, add) {
  let result = clone(base);
  for (let propertyName in add) {
    let value = add[propertyName];
    if (!value) {
      // ignore
    } else if (typeof(value) == "object") {
      if (!result[propertyName]) {
        result[propertyName] = clone(value);
      } else {
        result[propertyName] = jsonMerge(result[propertyName], value);
      }
    } else {
      result[propertyName] = value;
    }
  }
  return result;
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

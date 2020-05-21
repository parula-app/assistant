import AppLoader from './AppLoader.js';
import { AppBase } from '../AppBase.js';
import path from 'path';
import fs from 'fs';
import util from 'util';
const readdir = util.promisify(fs.readdir);

/**
 * Discovers build-in apps in top-level directory app/
 *
 * How it works:
 * - List directories in top-level dir app/, and for each:
 * - Takes the .js file with the same name as the dir,
 *   e.g. app/mpd/mpd.js
 * - Loads it using dynamic import()
 * - Takes the default export, as main app class
 * - Instantiates it
 */
export default class BuiltinAppsLoader extends AppLoader {
  async findApps() {
    const appsDirRelative = "../../app/";
    let currentDir = path.dirname(import.meta.url.replace("file:///", "/"));
    let appsDir = path.join(currentDir, appsDirRelative);
    //console.log("Loading built-in apps in directory ", appsDir);

    let Apps = [];
    let dirs = await readdir(appsDir, { withFileTypes: true });
    for (let dir of dirs) {
      if (!dir.isDirectory()) {
        continue;
      }
      let module = await import(appsDirRelative + dir.name + "/" + dir.name + ".js");
      let App = module.default;
      Apps.push(App);
    }

    let apps = Apps.map(App => new App())
        .filter(app => app instanceof AppBase);
    return apps;
  }
}

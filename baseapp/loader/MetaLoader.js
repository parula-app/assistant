import AppLoader from './AppLoader.js';
import BuiltinAppsLoader from './BuiltinAppsLoader.js';

/**
 * List of all loaders
 * {Array of AppLoader}
 */
const kLoaders = [ BuiltinAppsLoader ];

/**
 * Uses all the other app loaders to return all apps.
 */
export default class MetaLoader extends AppLoader {
  async findApps() {
    let allApps = [];
    for (let Loader of kLoaders) {
      let loader = new Loader();
      let apps = await loader.findApps();
      allApps = allApps.concat(apps);
    }
    return allApps;
  }
}

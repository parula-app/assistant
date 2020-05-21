/**
 * Discovers installed apps.
 *
 * Abstract class. The API for various app loaders.
 */
export default class AppLoader {
  /**
   * Returns a list of apps.
   *
   * @returns {Array of AppBase}   The app objects.
   *    They have been instantiated,
   *    but the load() function hasn't been called yet.
   */
  async findApps() {
  }
}

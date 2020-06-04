import { JSONApp } from '../../baseapp/JSONApp.js';

export default class Jokes extends JSONApp {
  constructor() {
    super("jokes");
  }

  async load(lang) {
    await super.load(lang);
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async joke(args, client) {
    return this.getResponse("other");
  }

  /**
   * Command
   * @param args {
   *    Type: {enum string}  matches response ID
   * }
   * @param client {ClientAPI}
   */
  async jokeOfType(args, client) {
    return this.getResponse(args.Type);
  }
}

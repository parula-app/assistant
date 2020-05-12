import * as huePackage from 'node-hue-api';
const hue = huePackage.default.v3;
import { JSONApp } from '../../baseapp/JSONApp.js';

export default class Hue extends JSONApp {
  constructor() {
    super("hue", "app/hue/");
    this.bridge = null;
  }

  async load(lang) {
    await super.load(lang);
    await this.connect();
  }

  async connect() {

  }

  async setup() {
    let bridges = await v3.discovery.nupnpSearch();
    // array of bridges that were found
    console.log(JSON.stringify(bridges, null, 2));
    bridges = bridges.filter(bridge => !bridge.error);
    this.bridge = bridges[0];
    if (!this.bridge) {
      console.info("No Philips Hue bridge found");
    }
  }

  /**
   * Command
   * @param args {null}
   *    Device {string}
   *    State {string enum} "on" or "off"
   * @param client {ClientAPI}
   */
  async lightOnoff(args, client) {
    if (args.State != "on" && args.State != "off") {
      throw new Error("State must be either on or off");
    }
  }
}

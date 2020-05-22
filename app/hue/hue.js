import * as huePackage from 'node-hue-api';
const hue = huePackage.default.v3;
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

export default class Hue extends JSONApp {
  constructor() {
    super("hue", "app/hue/");
    this._connection = null;
  }

  async load(lang) {
    await super.load(lang);
    await this.connect();
  }

  /**
   * @returns {Authenticated Hue API}
   */
  async connect() {
    if (this._connection) {
      return this._connection;
    }
    let config = getConfig().hue;
    let username = config ? config.username : null;
    let ipAddress = config ? config.ipAddress : null;
    if (!username || !ipAddress) {
      //{ username, ipAddress } = await this.setup(); -- JS parse error
      let creds = await this.setup();
      username = creds.username;
      ipAddress = creds.ipAddress;
    }
    const authenticatedAPI = await hue.api.createLocal(ipAddress).connect(username);
    // Test the connection
    const bridgeConfig = await authenticatedAPI.configuration.getConfiguration();
    console.log(`Connected to Hue bridge '${bridgeConfig.name}' at ${bridgeConfig.ipaddress}`);
    return authenticatedAPI;
  }

  /**
   * A one-time setup to find the bridge IP address,
   * create the access code to it, and save the data in the settings.
   *
   * This needs user action to press a button on the Bridge.
   * You need to instruct the user before you call this function.
   *
   * @return {
   *    ipAddress {string},
   *    username {string},
   * }
   * @throws Error when no bridges are found or access failed
   */
  async setup() {
    let bridge = await this.discoverBridge();
    return await this.createCredentials(bridge);
  }

  /**
   * Find the IP address of the Hue bridge on the local network.
   * @returns {string} ipAddress
   * @throws Error when no bridges are found
   */
  async discoverBridge() {
    let bridges = await hue.discovery.nupnpSearch();
    // array of bridges that were found
    console.log(JSON.stringify(bridges, null, 2));
    bridges = bridges.filter(bridge => !bridge.error);
    if (!bridges.length) {
      throw new Error("No Philips Hue bridge found");
    }
    return bridges[0].ipAddress;
  }

  /**
   * Create a user account on the Hue bridge to allows us access.
   *
   * This needs user action to press a button on the Bridge.
   *
   * @param ipAddress {string}
   * @return {
   *    ipAddress {string},
   *    username {string},
   * }
   */
  async createCredentials(ipAddress) {
    let unauthenticatedAPI = await hue.api.createLocal(ipAddress).connect();
    let deviceName = "pia"; // TODO add hostname
    try {
      let createdUser = await unauthenticatedAPI.users.createUser("pia-" + this.id, deviceName);
      console.log('************************************************************************\n');
      console.log('The following password to the Hue bridge has been created,\n' +
                  'which allows full access to your Hue bridge.\n' +
                  'It will be saved in your local settings file. Please do not share it.');
      console.log(`Hue bridge user: ${createdUser.username}`);
      //console.log(`Hue bridge key: ${createdUser.clientkey}`); -- needed only for Streaming API
      console.log('************************************************************************\n');
      return {
        username: createdUser.username,
        ipAddress: ipAddress,
      };
    } catch(ex) {
      if (ex.getHueErrorType && ex.getHueErrorType() === 101) {
        throw new Error("The Link button on the Hue bridge was not pressed. Please press the Link button and try again.");
      } else {
        throw ex;
      }
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
    const kValidStates = [ "on", "off" ];
    assert(kValidStates.includes(args.State), "State must be either on or off");

  }
}

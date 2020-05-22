import * as huePackage from 'node-hue-api';
const hue = huePackage.default.v3;
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';
import { wait, assert } from '../../util/util.js';

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
    let hostname = config ? config.hostname : null;
    let auth = config ? config.auth : null;
    if (!hostname) {
      hostname = await this.discoverBridge();
      assert(hostname, "No Hue bridge found"); // already threw in discoverBridge()
    }
    if (!auth) {
      //throw new Error("Hue bridge found, but not set up yet");
      auth = await this.createCredentialsPolling(hostname, 300);
    }
    const authenticatedAPI = await hue.api.createLocal(hostname).connect(auth);
    // Test the connection
    const bridgeConfig = await authenticatedAPI.configuration.getConfiguration();
    console.log(`Connected to Hue bridge '${bridgeConfig.name}' at ${bridgeConfig.ipaddress}`);
    return authenticatedAPI;
  }

  /**
   * A one-time setup to find the bridge IP address,
   * create the access code to it, and save the data in the settings.
   *
   * This needs user action in the process, @see createCredentials().
   *
   * @return {
   *    hostname {string},
   *    auth {string},
   * }
   * @throws Error when no bridges are found or access failed
   */
  async setup() {
    let hostname = await this.discoverBridge();
    let auth = await this.createCredentialsPolling(hostname, 300);
    return { hostname, auth };
  }

  /**
   * Find the IP address of the Hue bridge on the local network.
   * @returns {string} IP address
   * @throws Error when no bridges are found
   */
  async discoverBridge() {
    console.time("hue-discovery")
    let bridges = await hue.discovery.upnpSearch();
    console.timeEnd("hue-discovery")
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
   * You need to instruct the user before you call this function.
   *
   * This function call must happen within seconds after the button press,
   * so you probably need to call this function many times.
   * @see createCredentialsPolling()
   *
   * @param hostname {string}
   * @return {string} auth
   * @throws NeedLinkButtonPress when the user didn't press the button yet
   * }
   */
  async createCredentials(hostname) {
    let unauthenticatedAPI = await hue.api.createLocal(hostname).connect();
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
      return createdUser.username;
    } catch(ex) {
      if (ex.getHueErrorType && ex.getHueErrorType() === 101) {
        throw new NeedLinkButtonPress();
      } else {
        throw ex;
      }
    }
  }

  /**
   * Keep trying to authenticate, until it works
   * or `seconds` have passed.
   *
   * @see createCredentials()
   *
   * @param hostname {string}
   * @param seconds {int} timeout, in seconds
   * @return {string} auth
   */
  async createCredentialsPolling(hostname, seconds) {
    const kInterval = 2; // in seconds
    let tries = seconds / kInterval;
    for (let i = 0; i < tries; i++) {
      try {
        await wait(kInterval);
        return await this.createCredentials(hostname);
      } catch (ex) {
        if (ex instanceof NeedLinkButtonPress) {
          console.log(i, ex.message);
        } else {
          throw ex;
        }
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

class  NeedLinkButtonPress extends Error {
  constructor() {
    super("The Link button on the Hue bridge was not pressed. Please press the Link button and try again.");
    this.name = "NeedLinkButtonPress";
  }
}

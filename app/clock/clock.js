import { JSONApp } from '../../baseapp/JSONApp.js';

export default class Clock extends JSONApp {
  constructor() {
    super("clock");
  }

  async load(lang) {
    await super.load(lang);
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async time(args, client) {
    const format = { hour: 'numeric', minute: 'numeric' };
    return this.tr("time", { time: new Date().toLocaleTimeString(client.lang, format).replace(":", " ") });
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async date(args, client) {
    const format = { weekday: 'long', month: 'long', day: 'numeric' };
    return this.tr("date", { date: new Date().toLocaleDateString(client.lang, format) });
  }

  /**
   * Command, just to test the DateTimeDataType
   * @param args {obj}
   *   Time {Date}
   * @param client {ClientAPI}
   */
  async testTimeParse(args, client) {
    let time = args.Time;
    const format = { year: time.getUTCFullYear() == new Date().getUTCFullYear() ? undefined: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'long', month: 'long', day: 'numeric' };
    return time.toLocaleTimeString(client.lang, format).replace(":", " ");
  }
}

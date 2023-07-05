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
   * @param context {Context}
   */
  async time(args, client, context) {
    const format = { hour: 'numeric', minute: 'numeric' };
    return this.tr("time", { time: new Date().toLocaleTimeString(context.lang, format).replace(":", " ") });
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   * @param context {Context}
   */
  async date(args, client, context) {
    const format = { weekday: 'long', month: 'long', day: 'numeric' };
    return this.tr("date", { date: new Date().toLocaleDateString(context.lang, format) });
  }

  /**
   * Command, just to test the DateTimeDataType
   * @param args {obj}
   *   Time {Date}
   * @param client {ClientAPI}
   * @param context {Context}
   */
  async testTimeParse(args, client, context) {
    let time = args.Time;
    const format = { year: time.getUTCFullYear() == new Date().getUTCFullYear() ? undefined: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'long', month: 'long', day: 'numeric' };
    return time.toLocaleTimeString(context.lang, format).replace(":", " ");
  }
}

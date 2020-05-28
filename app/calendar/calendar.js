import dav from 'dav';
import { parseICS } from './ics.js';
import Sugar from 'sugar-date';
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

export default class Calendar extends JSONApp {
  constructor() {
    super("calendar");
    this._db = [];
  }

  async load(lang) {
    await super.load(lang);
    console.time("calendar-connect");
    let config = getConfig().calendar;
    if (!config.username) {
      throw this.error("not-configured");
    }
    let xhr = new dav.transport.Basic(
      new dav.Credentials({
        username: config.username,
        password: config.password,
      })
    );
    let account = await dav.createAccount({
      server: config.serverURL,
      //loadCollections: true,
      //loadObjects: true,
      xhr: xhr,
    });
    console.timeEnd("calendar-connect");
    const now = new Date();
    let events = [];
    let syncTokens = [];
    for (let calendar of account.calendars) {
      //console.log("Found calendar", calendar);
      let syncTokenRow = syncTokens.find(row => row.url == calendar.url);
      let syncToken = syncTokenRow ? syncTokenRow.syncToken : null;
      console.info("sync token", syncToken);
      console.time("calendar sync " + calendar.displayName);
      calendar = await dav.syncCalendar(calendar, {
        syncToken: syncToken,
        xhr: xhr,
      });
      console.timeEnd("calendar sync " + calendar.displayName);
      console.time("calendar parse " + calendar.displayName);
      console.log("Got", calendar.objects.length, "calendar entries for", calendar.displayName);

      for (let event of calendar.objects) {
        for (let ev of parseICS(event.calendarData)) {
          if (ev.start > now) {
            events.push(ev);
          }
        }
      }
      console.timeEnd("calendar parse " + calendar.displayName);
    }

    this._db = events;
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async upcomingEvents(args, client) {
    const kLimit = 5;
    let prefix = this.tr("next-are");
    let zeroAnswer = this.tr("zero");
    return await this.readEvents(events =>
      events.slice(0, kLimit)
    , prefix, zeroAnswer, client);
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async nextEvent(args, client) {
    let prefix = this.tr("next-is");
    let zeroAnswer = this.tr("zero");
    return await this.readEvents(events =>
      events.slice(0, 1)
    , prefix, zeroAnswer, client);
  }

  /**
   * Command
   * @param args {
   *    Date {Date}
   * }
   * @param client {ClientAPI}
   */
  async eventsAt(args, client) {
    let min = new Date(args.Date);
    let max = new Date(args.Date);
    let day = new Date(args.Date);
    day.setHours(0, 0, 0, 0);
    let minSugar = Sugar.Date(min);
    let timeOutput = minSugar.relative();
    if (min.valueOf() == day.valueOf()) { // input was a day without time
      //max = max.advance({ days: 1}, true); // end of day
      max.setHours(0, 0, 0, 0);
      max.setUTCDate(max.getUTCDate() + 1);
      /*if (minSugar.isToday()) {
        timeOutput = "today";
      }*/
    } else {
      //max = max.advance({ hours: 2});
      max.setUTCHours(max.getUTCHours() + 2);
    }
    console.log("min", min);
    console.log("max", max);
    let prefix = this.tr("events-at-time", { time: timeOutput });
    let zeroAnswer = this.tr("zero-at-time", { time: timeOutput });
    return await this.readEvents(events =>
      events.filter(event =>
        event.start >= min &&
        event.start <= max
      )
    , prefix, zeroAnswer, client);
  }

  /**
   * @param filterFunc {Function(events)}
   *    Gets and returns {Array of event}
   *    Caller can reduce the events returned
   *    using various filters or length criteria.
   * @param prefix {string}   What to say before the results
   * @param zeroAnswer {string}   What to say when there are no events matching
   */
  async readEvents(filterFunc, prefix, zeroAnswer, client) {
    const now = new Date();
    let events = this._db
      .filter(event => event.start > now)
      .sort((a, b) => a.start - b.start);

    events = filterFunc(events);

    if (!events.length) {
      return zeroAnswer;
    }

    return prefix + " \n" +
      events.map(ev => {
        return this.tr("event-short", {
          startTimeRelative: Sugar.Date(ev.start).relative(),
          summary: ev.summary,
        });
      }).join(". \n");
  }

  /**
   * Command
   * @param args {obj}
   *   Summary {string}
   *   Time {Date}
   * @param client {ClientAPI}
   */
  async add(args, client) {
    let summary = args.Summary;
    let time = args.Time;
    assert(summary, "Need summary");
    assert(time, "Need time");

    this._db.push(event);
    // TODO Add to CalDAV
    throw new Error("Not yet implemented"); // TODO

    return this.tr("add-done", {
      summary: summary,
      time: Sugar.Date(time).full(),
    });
  }

  /**
   * Command
   * @param args {obj}
   *   Summary {string}
   *   Time {Date}
   * @param client {ClientAPI}
   */
  async remove(args, client) {
    let summary = args.Summary;
    let time = args.Time;
    assert(summary, "Need summary");
    assert(time, "Need time");
    throw new Error("Not yet implemented"); // TODO

    // TODO Remove from CalDAV

    return this.tr("remove-done", {
      summary: summary,
      time: Sugar.Date(time).full(),
    });
  }
}

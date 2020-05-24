import dav from 'dav';
import { parseICS } from './ics.js';
import Sugar from 'sugar-date';
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

const kDBName = "Calendar";

export default class Calendar extends JSONApp {
  constructor() {
    super("Calendar", "app/calendar/");
    this._db = [];
  }

  async load(lang) {
    await super.load(lang);
    console.time("calendar-connect");


    let config = getConfig().calendar;
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
    let prefix = "Your next %count% events are:";
    return await this.readEvents(events =>
      events.slice(0, kLimit)
    , prefix, client);
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async nextEvent(args, client) {
    let prefix = "Your next appointment is:";
    return await this.readEvents(events =>
      events.slice(0, 1)
    , prefix, client);
  }

  /**
   * Command
   * @param args {
   *    Date {Date}
   * }
   * @param client {ClientAPI}
   */
  async eventsAt(args, client) {
    let min = Sugar.Date(args.Date);
    let max = Sugar.Date(args.Date);
    let day = Sugar.Date(args.Date).setHours(0, 0, 0, 0);
    let timeOutput = min.relative();
    if (min.isToday()) {
      max.advance({ hours: 2 });
    }
    if (min == day) { // input was a day without time
      max.advance({ days: 1}, true); // end of day
    } else {
      max.advance({ hours: 2 });
    }
    let prefix = "Your events on %time% are:".replace("%time%", timeOutput);
    return await this.readEvents(events =>
      events.filter(event =>
        event.start >= min &&
        event.start <= max
      )
    , prefix, client);
  }

  /**
   * @param filterFunc {Function(events)}
   *    Gets and returns {Array of event}
   *    Caller can reduce the events returned
   *    using various filters or length criteria.
   * @param prefix {string}   What to say before the results
   *    May contain the placeholder %count%
   */
  async readEvents(filterFunc, prefix, client) {
    const now = new Date();
    let events = this._db
      .filter(event => event.start > now)
      .sort((a, b) => a.start - b.start);

    events = filterFunc(events);

    if (!events.length) {
      return "You have no appointments scheduled";
    }

    return prefix.replace("%count%", events.length) + " " +
      events.map(ev => {
        return `In ${Sugar.Date(ev.start).relative()}: ${ev.summary}`;
      }).join(". ");
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
    return new Error("Not yet implemented"); // TODO

    return "I added %summary% on %time% to your calendar"
      .replace("%summary%", summary)
      .replace("%time%", time);
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
    return new Error("Not yet implemented"); // TODO

    // TODO Remove from CalDAV

    return "I cancelled %summary% on %time% from your calendar"
      .replace("%summary%", summary)
      .replace("%time%", time);
  }
}

import dav from 'dav';
import { parseICS } from './ics.js';
import Sugar from 'sugar-date';
import nanoSQL from "@nano-sql/core";
const nSQL = nanoSQL.nSQL;
import { JSONApp } from '../../baseapp/JSONApp.js';
import { getConfig } from '../../util/config.js';
import { assert } from '../../util/util.js';

const kDBName = "Calendar";

export default class Calendar extends JSONApp {
  constructor() {
    super("Calendar", "app/calendar/");
    this._db = null;
  }

  async load(lang) {
    await super.load(lang);
    console.time("calendar-connect");

    await nSQL().createDatabase({
      id: kDBName,
      mode: "PERM", // SnapDB
      //path: "~/.pia/db.nano/", TODO not working
      tables: [
        {
          name: "events",
          model: {
            "uid:uuid": { pk: true },
            "summary:string": {},
            "allday:boolean": {},
            "start:date": {},
            "end:date": {},
            "reminder:date": {},
            "location:string": {},
            "recurring:boolean": {},
            "participants:string": {},
            "notes:string": {},
          }
        },
        {
          name: "sync",
          model: {
            "id:uuid": { pk: true },
            "name:string": {},
            "url:string": {},
            "syncToken:string": {},
          }
        }
      ],
      version: 1, // schema version
    });
    nSQL().useDatabase(kDBName);

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
    let events = [];
    let syncTokens = await nSQL("sync").query("select", [
      "syncToken", "url",
    ]).exec();
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
      await nSQL("sync").query("upsert", {
        id: calendar.id,
        name: calendar.displayName,
        url: calendar.url,
        syncToken: calendar.syncToken,
      }).exec();

      console.log("Got", calendar.objects.length, "calendar entries for", calendar.displayName);

      for (let event of calendar.objects) {
        for (let ev of parseICS(event.calendarData)) {
          events.push(ev);
        }
      }
      console.timeEnd("calendar parse " + calendar.displayName);
    }

    for (let ev of events) {
      console.log(`  ${ev.summary} is in ${Sugar.Date(ev.start).relative().replace(" from now", "")}` + (ev.location ? ` in ${ev.location}` : ''));
      //console.log(ev);
      await nSQL("events").query("upsert", {
        uid: ev.uid,
        summary: ev.summary,
        allday: ev.start.dateOnly,
        start: ev.start,
        end: ev.end,
        reminder: ev.reminder,
        location: ev.location,
      }).exec();
    }
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async upcomingEvents(args, client) {
    const kLimit = 5;
    let prefix = "Your next %count% events are:";
    await this.readEvents(events =>
      events.slice(0, kLimit)
    , prefix, client);
  }

  /**
   * Command
   * @param args {null}
   * @param client {ClientAPI}
   */
  async nextEvent(args, client) {
    let prefix = "Your next event is:";
    await this.readEvents(events =>
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
  async eventAt(args, client) {
    let min = Sugar.Date.create(args.Date);
    let max = Sugar.Date.create(args.Date);
    let day = Sugar.Date.create(args.Date).setHours(0, 0, 0, 0);
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
    await this.readEvents(events =>
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
    nSQL().useDatabase(kDBName);
    let events = await nSQL("events").query("select", [
      "summary",
      "start",
      "reminder",
      "location",
    ]).where([
      [ "start", ">", now ],
    ]).exec();

    events = filterFunc(events);

    if (!events.length) {
      return "You have no appointments scheduled";
    }

    return prefix.replace("%count%", events.length) +
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
    return; // TODO

    nSQL().useDatabase(kDBName);
    await nSQL("tasks").query("upsert", {
      task: task,
      list: list,
    }).exec();

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
    return; // TODO

    nSQL().useDatabase(kDBName);
    await nSQL("tasks").query("delete").where([
      [ "summary", "=", summary ],
      "AND",
      [ "time", "=", time ],
    ]).exec();

    return "I cancelled %summary% on %time% from your calendar"
      .replace("%summary%", summary)
      .replace("%time%", time);
  }
}

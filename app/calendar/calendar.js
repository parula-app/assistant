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
    let startTime = new Date();

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
            "start:datetime": {},
            "end:datetime": {},
            "reminder:datetime": {},
            "location:string": {},
            "recurring:boolean": {},
            "participants:string": {},
            "notes:string": {},
          }
        },
        {
          name: "calendars",
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
      loadObjects: true,
      xhr: xhr,
    });
    console.log("Calendar fetch took " + (new Date() - startTime) + "ms");
    const parseStartTime = new Date();
    let events = [];
    /*let calendarsDB = await nSQL("events").query("select", [
      "url",
      "syncToken",
    ]).exec();*/
    for (let calendar of account.calendars) {
      console.log('Found calendar ' + calendar.displayName);
      /*
      let calendarDB = calendarsDB.find(cal => cal.url == calendar.url);
      console.info("sync token", calendarDB ? calendarDB.syncToken : null);
      calendar = await dav.syncCalendar(calendar, {
        syncToken: calendarDB ? calendarDB.syncToken : null,
        xhr: xhr,
      });
      */
      await nSQL("calendars").query("upsert", {
        name: calendar.displayName,
        url: calendar.url,
        syncToken: calendar.syncToken,
      }).exec();

      for (let event of calendar.objects) {
        for (let ev of parseICS(event.calendarData)) {
          events.push(ev);
        }
      }
    }
    console.log("Calendar parse took " + (new Date() - parseStartTime) + "ms");
    nSQL().useDatabase(kDBName);
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
  async read(args, client) {
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

    if (!events.length) {
      return "You have no appointments scheduled";
    }

    return "You have %count% appointments in your calendar: "
      .replace("%count%", events.length) +
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

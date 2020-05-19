import dav from 'dav';
import ical from 'ical';
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
            "id:uuid": { pk: true },
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
        }
      ],
      version: 1, // schema version
    });

    let config = getConfig().calendar;
    let xhr = new dav.transport.Basic(
      new dav.Credentials({
        username: config.username,
        password: config.password,
      })
    );

    let account = await dav.createAccount({
      server: config.serverURL,
      loadCollections: true,
      loadObjects: true,
      xhr: xhr,
    });
    console.log("Calendar fetch took " + (new Date() - startTime) + "ms");
    const now = new Date();
    let events = [];
    for (let calendar of account.calendars) {
      console.log('Found calendar ' + calendar.displayName);
      for (let event of calendar.objects) {
        let data = ical.parseICS(event.calendarData);
        for (let k in data) {
          if (!data.hasOwnProperty(k) || data[k].type != 'VEVENT') {
            continue;
          }
          let ev = data[k];
          if (ev.start < now) {
            continue;
          }
          for (let l in ev) {
            if (!ev.hasOwnProperty(l) || ev[l].type != 'VALARM') {
              continue;
            }
            let alarm = ev[l];
            let pt = alarm.trigger;
            if (pt && pt.startsWith("-PT")) {
              let reminder = new Date(ev.start.valueOf());
              let value = parseInt(pt.substr(3, pt.length - 4));
              if (isNaN(value)) {
                // skip
                console.error(pt);
              } else if (pt.endsWith("M")) {
                reminder.setUTCMinutes(reminder.getUTCMinutes() - value);
              } else if (pt.endsWith("H")) {
                reminder.setUTCHours(reminder.getUTCHours() - value);
              } else if (pt.endsWith("D")) {
                reminder.setUTCDate(reminder.getUTCDate() - value);
              } else {
                console.error(pt);
              }
              ev.reminder = reminder; // e.g. '-PT1440M', M = minutes, H = hours
            } else {
              console.error(pt);
            }
          }
          events.push(ev);
        }
      }
    }
    console.log("Calendar parse took " + (new Date() - now) + "ms");
    nSQL().useDatabase(kDBName);
    for (let ev of events) {
      console.log(`  ${ev.summary} is in ${Sugar.Date(ev.start).relative()}` + (ev.location ? ` in ${ev.location}` : ''));
      //console.log(ev);
      await nSQL("events").query("upsert", {
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

import ical from 'ical';

/**
 * @param icsString {string} ICS file contents
 * @returns {Array of {
 *   summary {string}
 *   allday {boolean}
 *   start {Date}
 *   end {Date}
 *   reminder {Date}
 *   ...
 * }}
 */
export function parseICS(icsString) {
  let results = [];
  let now = new Date();
  let data = ical.parseICS(icsString);
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
    results.push(ev);
  }
  return results;
}

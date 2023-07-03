/**
 * @param date {Date}
 * @returns {string}
 * For today: Time, e.g. "15:23"
 * This week: Weekday, Time, e.g. "Wed 15:23"
 * Other this year: Date without year and time, e.g. "23.11. 15:23"
 * Other: Date and time, e.g. "23.11.2018 15:23"
 * Each in locale
 * See also <https://momentjs.com> for relative time
 */
export function getDateString(date) {
  var dateDetails = null;
  let today = new Date();
  if (date.getDate() == today.getDate()) {
    dateDetails = { hour: "numeric", minute: "numeric" };
  } else if (
    today.getMilliseconds() - date.getMilliseconds() <
    7 * 24 * 60 * 60 * 1000
  ) {
    // this week
    dateDetails = { weekday: "short", hour: "numeric", minute: "numeric" };
  } else if (date.getFullYear() == today.getFullYear()) {
    // this year
    dateDetails = {
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    };
  } else {
    dateDetails = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    };
  }
  return date.toLocaleString(navigator.language, dateDetails);
}

/**
 * parses "2 1/2 minutes" from the string
 * @param descr {string}
 */
export function getTime(descr) {
  let words = descr.split(" ");
  let pos = words.findIndex(w => w == "minute" || w == "minutes" || w == "min" || w == "hour" || w == "hours");
  if (pos < 0) {
    return;
  }
  let unit = words[pos];
  let unitInSeconds;
  if (unit == "minute" || unit == "minutes" || unit == "min") {
    unitInSeconds = 60;
  } else if (unit == "hour" || unit == "hours") {
    unitInSeconds = 3600;
  }
  if (!unitInSeconds) {
    return;
  }
  let prev = words[pos - 1];
  if (!prev) {
    return;
  }
  let number = wordToNumber(prev);
  if (isNaN(number)) {
    return;
  }
  let prev2 = words[pos - 2];
  if (prev2) {
    let number2 = wordToNumber(prev);
    if (!isNaN(number2)) {
      number += number2;
    }
  }
  return number * unitInSeconds;
}

/**
 * @param word {string}
 * @returns {number | null}
 */
export function wordToNumber(word) {
  let amount = parseFloat(word);
  if (word == "½") {
    amount = 0.5;
  } else if (word == "⅓") {
    amount = 0.33;
  } else if (word == "¼") {
    amount = 0.25;
  } else if (word == "¾") {
    amount = 0.75;
  } else if (word.includes("/")) {
    let fraction = word.split("/");
    if (fraction.length == 2) {
      amount = parseFloat(fraction[1]) / parseFloat(fraction[1]);
    }
  }
  if (isNaN(amount)) {
    return null;
  }
  return amount;
}

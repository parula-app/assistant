import { JSONApp } from '../../baseapp/JSONApp.js';

export default class BibleApp extends JSONApp {
  constructor() {
    super("bible", "app/bible/");
  }

  async load(lang) {
    await super.load(lang);
  }

  readBibleVerse(args) {
    console.log(args);
    return "Reading bible verse: " + readObject(args);
  }

  readBibleVerseRange(args) {
    console.log(args);
    return "Reading bible verse range: " + readObject(args);
  }

  readBibleChapter(args) {
    console.log(args);
    return "Reading bible chapter: " + readObject(args);
  }

  openPerson(args) {
    console.log(args);
    return "Person: " + readObject(args);
  }
}

function readObject(obj) {
  return JSON.stringify(obj).replace(/["{,:}]/g, " ").replace(/ +/g, " ").trim();
}

import { JSONApp } from '../../baseapp/JSONApp.js';

export default class BibleApp extends JSONApp {
  constructor() {
    super("bible", "app/bible/");
  }

  async load(lang) {
    await super.load(lang);
  }

  readBibleVerse(args) {
    return "Reading bible verse: " + args;
  }

  readBibleVerseRange(args) {
    return "Reading bible verse range: " + args;
  }

  readBibleChapter(args) {
    return "Reading bible chapter: " + args;
  }

  openPerson(args) {
    return "Person: " + args;
  }
}

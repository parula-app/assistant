import { Client } from "./Client.js";

/**
 * The API for the `client` object that gets passed to the voice app.
 *
 * It exposes only selected functions of the client.
 * The voice app should not be able to call exit() :-) .
 */
export class ClientAPI {
  /**
   * @param client {Client}
   */
  constructor(client) {
    assert(client instanceof Client);
    this.client = client;
    this._sentences = [];
  }

  /**
   * The language of the current user session.
   * The voice app should translate all responses into this language.
   * @returns {string} 2-letter ISO language code
   */
  get lang() {
    return this.client.lang;
  }

  /**
   * Output that the app returned using `say()`
   */
  get outputSentences() {
    return this._sentences;
  }

  /**
   * Output a specific text to the user
   * @param outputText {string} text for the end user,
   *   translated into language `this.lang`.
   */
  say(outputText) {
    // remove <ssml> tags
    outputText = outputText.replace(/<[^>]*>/g, " ").replace(/ +/g, " ").trim();
    //this._sentences.push(outputText);
    for (let sentence of outputText.split(". ")) { // TODO "2."
      this._sentences.push(sentence);
    }
  }

  card(card) {
    if (card.type == "simple") {
      console.log("\n  " + card.title + "\n\n" + card.content + "\n");
    } else {
      console.log(card);
    }
  }
}

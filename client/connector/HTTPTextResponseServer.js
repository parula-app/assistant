import { catchHTTPJSON } from './HTTPServer.js';
import { assert } from '../../util/util.js';
import express from 'express';

/**
 * Accepts user commands in text form via HTTP,
 * runs the NLP and IntentParser and voice apps,
 * and returns the app response as HTTP result.
 *
 * This allows to implement an assistant client/UI
 * in a separate process, and it 
 */
export default class HTTPTextResponseServer {
  /**
   * @param client {Client}
   * @param expressApp {Express}
   */
   constructor(client, expressApp) {
    this._intentParser = client.intentParser; /** {IntentParser} */
    expressApp.put(`/assistant/text`, express.json(), (req, resp) => catchHTTPJSON(req, resp, async () =>
      await this.processQuestion(req.body)));
  }

  /**
   * A question (in form of text) from the end user.
   *
   * @param json {
   *   question {string}
   * }
   */
  async processQuestion(json) {
    let question = json.question;
    assert(question && typeof(question) == "string", "Need question");
    let { intent, args } = await this._intentParser.match(question);
    let answerText = await this._intentParser.startIntent(intent, args);
    let context = this._intentParser.clientAPI.currentContext;
    // assert(answerText == context.resultText, "Wrong answer in context:\n" + answerText + "\nvs.\n" + context.resultText);
    context.resultText = answerText;
    return context;
  }
}

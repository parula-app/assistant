#!/usr/bin/env node
'use strict';

import { Client } from './client/Client.js';
import wildLeven from './intentParser/wildLeven/wildLeven.js';

function testDistance(input, target) {
  let result = wildLeven(input, target);
  let distance = result.editDistance;
  console.log("input", input, input.length, "target", target, target.length,"distance:", distance, "distance/input", distance / input.length, "distance/target", distance / target.length);
}

/**
 * Tests the intent parser and apps with a hardcoded string.
 */
class TestClient extends Client {
  async start() {
    await this.load("en");
    let successCount = 0;
    let failCount = 0;
    for (let input in expected) {
      let exp = expected[input];
      console.log("Testing command: " + input);
      try {
        let response = await this.intentParser.startApp(input);
        if (exp == response) {
          successCount++;
        } else {
          console.error('FAIL: input: "' + input + '", expected: "' + exp + '", but got: "' + response + '"');
          failCount++;
        }
      } catch (ex) {
        console.error('FAIL: input: "' + input + '", expected: "' + exp + '", but got: "' + (ex.message || ex) + '"');
        console.error(ex);
        failCount++;
      }
    }
    if (failCount) {
      console.log("FAIL: " + failCount + " of " + (failCount + successCount) + " tests failed");
    } else {
      console.log("SUCCESS: All " + successCount + " tests passed");
    }
    await this.quit();
  }
}

(async () => {
  try {
    await new TestClient().start();
  } catch (ex) {
    console.error(ex);
  }
})();

const expected = {
  //"play the song return to sender": "",
  //"stop": "",
  //"play songs by this artist": "",
  //"stop": "",
  "open genesis five verse three": `Adam lived one hundred thirty years, and became the father of a son in his own likeness, after his image, and named him Seth.`,
  "read revelation 21 vers fine": "And the One seated on the throne said: “Look! I am making all things new.” Also he says: “Write, for these words are faithful and true.”",
  "read genesis chapter one verse twenty two": `God blessed them, saying, “Be fruitful, and multiply, and fill the waters in the seas, and let birds multiply on the earth.”`,
  "read revelation 21 vers fine": `He who sits on the throne said, “Behold, I am making all things new.” He said, “Write, for these words of God are faithful and true.”`,
  "add butter to my shopping list": "I added butter to your shopping list",
  "remove butter from my shopping list": "I removed butter from your shopping list",
  //"test tell me that time to morrow at 2 p m": "Wednesday, May 20, 2 00 PM",
  //"test tell me that time to morrow at 2": "Wednesday, May 20, 2 00 PM", // Sugar returns 2001-02-01 00:00
};

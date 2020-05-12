#!/usr/bin/env node
'use strict';

import { Client } from './client/Client.js';
import wildLeven from './intentparser/leven.js';

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
    let tests = [
      // target, input
      [ "default", "suitable" ],
      [ "default", "defaul" ],
      [ "default", "fault" ],
      [ "default", "foolt" ],
      [ "default", "the fool" ],
      [ "default", "the" ],
      [ "default", "" ],
    ];
    for (let test of tests) {
      testDistance(test[1], test[0]);
    }
    return;
    await this.load();
    let successCount = 0;
    let failCount = 0;
    for (let input in expected) {
      let exp = expected[input];
      let response = await this.intentParser.startApp(input);
      if (exp == response) {
        successCount++;
      } else {
        console.error('FAIL: input: "' + input + '", expected: "' + exp + '", but got: "' + response + '"');
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
  "read genesis chapter one verse twenty two": "With that God blessed them, saying: “Be fruitful and become many and fill the waters of the sea, and let the flying creatures become many in the earth.”",
  "open genesis five verse three": "With that God blessed them, saying: “Be fruitful and become many and fill the waters of the sea, and let the flying creatures become many in the earth.”. Adam lived for 130 years and then became father to a son in his likeness, in his image, and he named him Seth.",
};

/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

const { MakeHaus, Stacks } = require('..');
const { Parameters } = require('@makeproaudio/parameters-js');
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'layouts/makehaus-simple-encoder8-turn.json');
const layoutJson = fs.readFileSync(jsonPath);

MakeHaus.init(
  layoutJson,
  () => {
    /* UI Initialization was successful. The web app is now running */
  },
  () => {
    /* All widgets required from tilechain definition are now available */
    /* Get the stack */
    const stack = Stacks.get('stack-1');
    /* Create a parameter. */
    const param = Parameters.newParameter('maker', stack.name());
    stack.bind(param, (evt) => {
      /* Make sure that the value is not undefined */
      if (evt.value !== undefined) {
        /* update the label to reflect the value */
        stack.setLabel(evt.value.toString());
        if (evt.value > 50) {
          /* experiment with updating the color
           * update the context string to reflect something meaningful */
          stack.setContext('HOT');
          stack.setColor('#FF0000');
        } else {
          stack.setContext('COOL');
          stack.setColor('#00FF00');
        }
      }
    });
  }
);

/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

const { MakeHaus, Stacks } = require('..');
const { Parameters } = require('@makeproaudio/parameters-js');
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'layouts/makehaus-full-phone.json');
const layoutJson = fs.readFileSync(jsonPath);

MakeHaus.init(
  layoutJson,
  () => {
    /* UI Initialization was successful. The web app is now running */
  },
  () => {
    /* All widgets required from tilechain definition are now available */
    const primarySelectorStackNames = [5, 6, 7, 8].map((id) => 'stack-' + id);
    const secondarySelectorStackNames = [1, 2, 3, 4].map((id) => 'stack-' + id);

    /* Filter the primary selector and secondary selector stacks */
    const primaryStacks = Stacks.getAll().filter((stack) => primarySelectorStackNames.includes(stack.name()));
    const secondaryStacks = Stacks.getAll().filter((stack) => secondarySelectorStackNames.includes(stack.name()));

    /* Pass the primary selector and secondary selector stacks to the animate function */
    animateSelectors({ primary: primaryStacks, secondary: secondaryStacks });
  }
);

const animateSelectors = (stacks) => {
  /* Define hues to be used in the animator */
  const primaryHues = [0, 127, 230, 35];
  const primaryLightness = 0.5;
  const secondaryLightness = 0.75;
  const commonSaturation = 1;

  /* we'll use a simple index based approach for getting the appropriate hue from the */
  const hueForStack = (stack) => {
    const index = stacks.primary.indexOf(stack);
    return primaryHues[index];
  };

  /* initialize the selected primary and secondary selectors to be the first ones from respective stacks */
  let selectedPrimary = stacks.primary[0];
  let selectedSecondary = stacks.secondary[0];

  /* initialize colors on the stacks */
  (() => {
    stacks.primary.forEach((stack) => {
      const hue = hueForStack(stack);
      stack.setHsl(hue, commonSaturation, primaryLightness);
    });

    stacks.secondary.forEach((stack) => {
      const hue = hueForStack(selectedPrimary);
      stack.setHsl(hue, commonSaturation, secondaryLightness);
    });

    selectedSecondary.setHsl(hueForStack(selectedPrimary), commonSaturation, primaryLightness);
  })();

  /* tune into parameter value changes on the each of the primary selector stacks */
  stacks.primary.forEach((s) => {
    const param = Parameters.newParameter('maker', s.name());
    s.bind(param, (evt) => {
      if (evt.value !== undefined) {
        /* since the press event of the ui buttons has been subscribed to
         * in the layout json, updated values will be received here
         */

        /* we'll take any new valid value here as a sign of change.
         * Update the state of the selected primary */
        selectedPrimary = s;

        /* Delegate handler functionality */
        handleSelectedPrimary();
      }
    });
  });

  /* simple handler to change colors of primary and secondary selectors */
  const handleSelectedPrimary = () => {
    const hue = hueForStack(selectedPrimary);
    stacks.secondary.forEach((stack) => stack.setHsl(hue, commonSaturation, secondaryLightness));
    selectedSecondary.setHsl(hue, commonSaturation, primaryLightness);
  };

  /* similar to primary selector stacks,
   *tune into parameter value changes on the each of the secondary selector stacks */
  stacks.secondary.forEach((s) => {
    const param = Parameters.newParameter('maker', s.name());
    s.bind(param, (evt) => {
      if (evt.value !== undefined) {
        selectedSecondary = s;
        handleSelectedSecondary();
      }
    });
  });

  /* simple handler to change colors of secondary selectors */
  const handleSelectedSecondary = () => {
    const hue = hueForStack(selectedPrimary);
    stacks.secondary.forEach((stack) => stack.setHsl(hue, commonSaturation, secondaryLightness));
    selectedSecondary.setHsl(hue, commonSaturation, primaryLightness);
  };
};

/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

const { MakeHaus, Stacks, WidgetType, Rows } = require('..');
const { Parameters, ParameterType } = require('@makeproaudio/parameters-js');
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const randomColor = require('randomcolor');

const jsonPath = path.join(__dirname, 'layouts/makehaus-full-tablet.json');
const layoutJson = fs.readFileSync(jsonPath);

const stackIds = (start, end) => {
  return _.range(start, end).map((id) => 'stack-' + id);
};

const stacksForIds = (stackIdArray) => {
  return Stacks.getAll().filter((stack) => stackIdArray.includes(stack.name()));
};

const webappPort = 3001;
const websocketPort = 8002;
MakeHaus.init(
  layoutJson,
  () => {
    /* Initialization was successful. The web app is now running */
    const functionButtonStackNames = stackIds(1, 9);

    const functionButtonStacks = stacksForIds(functionButtonStackNames);
    animateFunctionButtons(functionButtonStacks);
  },

  () => {
    const primarySelectorStackNames = stackIds(49, 57);
    const secondarySelectorStackNames = stackIds(41, 49);
    const onOffButtonStackNames = stackIds(25, 33);

    /* Filter the primary selector and secondary selector stacks */

    const primaryStacks = stacksForIds(primarySelectorStackNames);
    const secondaryStacks = stacksForIds(secondarySelectorStackNames);
    const onOffButtonStacks = stacksForIds(onOffButtonStackNames);

    animateOnOffButtons(onOffButtonStacks);
    animateSelectors({ primary: primaryStacks, secondary: secondaryStacks });
  },
  { webappPort, websocketPort }
);

function animateFunctionButtons(stacks) {
  (() => {
    const functionButtonsPrefix = 'FUNC';
    let i = 0;

    stacks.forEach((stack) => {
      stack.setParameterType({ type: ParameterType.STRING, value: functionButtonsPrefix + '-' + ++i });
      /* By default, when the parameter type of a stack is changed
       * all the UI widgets of that stack transform to a widget of a certain type.
       * Force override the widget types using the setWidgetsType function on the stack */
      stack.setWidgetsType(WidgetType.BUTTON);
    });
  })();

  stacks.forEach((stack) => {
    const param = Parameters.newParameter('maker', stack.name());
    stack.bind(param, (evt) => {
      if (evt.value !== undefined) {
        rows([2, 3, 5]).forEach((row) => {
          const rc = randomColor();
          row.stacks().forEach((stack) => {
            stack.setColor(rc);
          });
        });
      }
    });
  });
}

const animateOnOffButtons = (stacks) => {
  const colorOn = '#EF9947';
  const colorOff = '#646C73';

  (() => {
    stacks.forEach((s) => {
      /* override colors in the layout json by initializing them all to off by default */
      s.setColor(colorOff);
      const param = Parameters.newParameter('maker', s.name());
      s.bind(param, (evt) => {
        if (evt.value === 'ON') {
          s.setColor(colorOn);
        } else if (evt.value === 'OFF') {
          s.setColor(colorOff);
        }
      });
    });
  })();
};

const animateSelectors = (stacks) => {
  /* Define hues to be used in the animator */
  const primaryHues = [0, 127, 230, 35, 73, 174, 270, 329];
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
    const selector1Prefix = 'TOPIC';

    let i = 0;
    stacks.primary.forEach((stack) => {
      const hue = hueForStack(stack);
      stack.setHsl(hue, commonSaturation, primaryLightness);

      const label = selector1Prefix + '-' + ++i;
      stack.setParameterType({ type: ParameterType.STRING_ARRAY, values: [label], value: label });
    });

    const selector2Prefix = 'ZONE';
    i = 0;
    stacks.secondary.forEach((stack) => {
      const hue = hueForStack(selectedPrimary);
      stack.setHsl(hue, commonSaturation, secondaryLightness);

      const label = selector2Prefix + '-' + ++i;
      stack.setParameterType({ type: ParameterType.STRING_ARRAY, values: [label], value: label });
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
    randomizeRows();
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
    randomizeRows();
  };
};

const randomizeRows = () => {
  rows([2, 3, 5]).forEach((row) => {
    row.stacks().forEach((stack) => {
      stack.setValue(Math.round(Math.random() * 100));
    });
  });
};

const rows = (rowsArray) => {
  return rowsArray.map((i) => 'row-' + i).map((i) => Rows.get(i));
};

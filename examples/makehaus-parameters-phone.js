/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

const { MakeHaus, Stacks } = require('..');
const { Parameters, ParameterType } = require('@makeproaudio/parameters-js');
const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, 'layouts/makehaus-parameters-phone.json');
const layoutJson = fs.readFileSync(jsonPath);

const animateBindsForward = ({ widgetStacks, typesStacks, bindStacks }) => {
  const selectedColor = '#0000ff';
  const unselectedColor = '#444444';

  const colors = ['#ff0000', '#00ff00', '#0000ff', '#00ffff'];
  const colorMap = new Map();
  [0, 1, 2, 3].forEach((n) => {
    colorMap.set(n, colors[n]);
    widgetStacks[n].setColor(colors[n]);
  });

  const parametersOfStack = widgetStacks.map((s) => s.parameter());

  const map = new Map();
  const selectedMap = new Map();

  bindStacks.forEach((s) => {
    selectedMap.set(s, false);
    const mappedIdx = s.parameter().id().split('-')[1] % 9;
    s.parameter().addListener((evt) => {
      if (evt.value) {
        switch (evt.value) {
          case '>':
            toggleBind(s);
            break;
          default:
            break;
        }
      }
    });
    map.set(s, mappedIdx);
  });

  const toggleBind = (s) => {
    console.log(`toggling ${map.get(s)} of stack ${s.name()}`);
    toggleSelected(s);
  };

  const applyColor = (s) => {
    selectedMap.get(s) === true ? s.setColor(selectedColor) : s.setColor(unselectedColor);
  };

  const updateParameterSelectedState = (s) => {
    selectedMap.set(s, !selectedMap.get(s));
  };

  const handleBindColor = (s) => {
    applyColor(s);
  };

  const bindAllToLeftToDestination = (destination, lefts, currIndex) => {
    for (let i = currIndex - 1; i >= 0; i--) {
      const ls = lefts[i];
      if (selectedMap.get(ls) !== true) break;
      const param = parametersOfStack[map.get(ls)];
      param.unbind();
      param.bindFrom(destination, () => {});
    }
  };

  const handleSelected = (s) => {
    //unbind self
    const param = parametersOfStack[map.get(s)];
    param.unbind();
    //find next bind stack ahead of me which is unselected - the destination parameter
    const rightOfMe = bindStacks.slice(bindStacks.indexOf(s) + 1);
    const nextUnselectedStack = rightOfMe.filter((s) => selectedMap.get(s) === false)[0];
    //bind self to destination parameter
    const mappedParamOfNextUnselectedStack = parametersOfStack[map.get(nextUnselectedStack)];
    param.bindFrom(mappedParamOfNextUnselectedStack, () => {});
    // bind all selected to the left of me to the destination parameter
    const leftOfMe = bindStacks.slice(0, bindStacks.indexOf(s));
    bindAllToLeftToDestination(mappedParamOfNextUnselectedStack, leftOfMe, bindStacks.indexOf(s));
  };

  const handleUnselected = (s) => {
    // unbind self
    const param = parametersOfStack[map.get(s)];
    param.unbind();

    const leftOfMe = bindStacks.slice(0, bindStacks.indexOf(s));
    bindAllToLeftToDestination(param, leftOfMe, bindStacks.indexOf(s));

    MakeHaus.refreshUI();
  };

  const toggleSelected = (s) => {
    updateParameterSelectedState(s);
    selectedMap.get(s) ? handleSelected(s) : handleUnselected(s);
    handleBindColor(s);
  };

  typesStacks.forEach((s) => {
    s.parameter().addListener((evt) => {
      if (evt.value) {
        const mappedIdx = s.parameter().id().split('-')[1] % 5;
        switch (evt.value) {
          case 'TYP':
            toggle(mappedIdx);
            break;
          default:
            break;
        }
      }
    });
  });

  let i = 0;
  const toggle = (idx) => {
    const available = [
      { min: 0, max: 100, step: 1, value: 0, type: ParameterType.NUMBER },
      { min: 0, max: 100, step: 10, value: 0, type: ParameterType.NUMBER },
      { values: ['A', 'B', 'C', 'D', 'E'], value: 'A', type: ParameterType.STRING_ARRAY },
      { values: [0, 5, 10, 15, 20, 21, 22, 23], value: 0, type: ParameterType.NUMBER_ARRAY },
      // { value: true, type: ParameterType.BOOLEAN },
    ];

    parametersOfStack[idx].updateType(available[++i % available.length]);
  };
};

const animateBindsCentralParam = ({ widgetStacks, typesStacks, bindStacks }) => {
  /* create the central parameter to which all the stacks will bind to*/
  const central = Parameters.newParameter('maker', 'central');
  central.updateType({ min: 0, max: 100, step: 1, value: 0, type: ParameterType.NUMBER });

  const parametersOfStack = widgetStacks.map((s) => s.parameter());

  bindStacks.forEach((s) => {
    s.parameter().addListener((evt) => {
      if (evt.value) {
        const mappedIdx = s.parameter().id().split('-')[1] % 9;
        switch (evt.value) {
          case 'BOUND':
            parametersOfStack[mappedIdx].bindFrom(central, widgetStacks[mappedIdx].uiL());
            break;
          case 'UNBOUND':
            parametersOfStack[mappedIdx].unbind();
            break;
          default:
            break;
        }
      }
    });
  });

  typesStacks.forEach((s) => {
    s.parameter().addListener((evt) => {
      if (evt.value) {
        const mappedIdx = s.parameter().id().split('-')[1] % 5;
        switch (evt.value) {
          case 'TYP':
            toggle(mappedIdx);
            break;
          default:
            break;
        }
      }
    });
  });

  let i = 0;
  const toggle = (idx) => {
    const available = [
      { min: 0, max: 100, step: 1, value: 0, type: ParameterType.NUMBER },
      { values: ['A', 'B', 'C', 'D', 'E'], value: 'A', type: ParameterType.STRING_ARRAY },
      { values: [0, 5, 10, 15, 20], value: 0, type: ParameterType.NUMBER_ARRAY },
      // { value: true, type: ParameterType.BOOLEAN },
    ];

    parametersOfStack[idx].updateType(available[++i % available.length]);
  };
};

const runnable = animateBindsForward;
MakeHaus.init(
  layoutJson,
  () => {},
  () => {
    /* UI Initialization was successful. The web app is now running */
    const dynamicWidgetStackNames = [1, 2, 3, 4].map((id) => 'stack-' + id);
    const typeButtonStackNames = [5, 6, 7, 8].map((id) => 'stack-' + id);
    const bindButtonStacknames = [9, 10, 11, 12].map((id) => 'stack-' + id);

    const widgetStacks = Stacks.getAll().filter((stack) => dynamicWidgetStackNames.includes(stack.name()));
    const typesStacks = Stacks.getAll().filter((stack) => typeButtonStackNames.includes(stack.name()));
    const bindStacks = Stacks.getAll().filter((stack) => bindButtonStacknames.includes(stack.name()));
    runnable({ widgetStacks, typesStacks, bindStacks });
  }
);

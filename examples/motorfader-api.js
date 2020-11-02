/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

const { hub, Tile, MotorFaderEvents } = require('..');

hub.init('localhost', '8192');
[Tile.MOTORFADER4].forEach((type) => {
  hub.on(type, (tile) => {
    console.log('New Motorfader tile found. Move the first fader to see api functionality');
    tile.widgets[0].on(MotorFaderEvents.UPDATED, (motorfader, val) => {
      [1, 2, 3].forEach((windex) => tile.widgets[windex].setValue(val));
    });
  });
});

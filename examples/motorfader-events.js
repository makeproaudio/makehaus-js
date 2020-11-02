/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

const { hub, Tile, MotorFaderEvents } = require('..');

hub.init('localhost', '8192');
[Tile.MOTORFADER4].forEach((type) => {
  hub.on(type, (tile) => {
    console.log('New Motorfader tile found. Fiddle with your motorfaders to see events');
    tile.widgets.forEach((w) => {
      w.on(MotorFaderEvents.TOUCHED, (motorfader) => {
        console.log(`${motorfader.widgetId} touched`);
      });

      w.on(MotorFaderEvents.UNTOUCHED, (motorfader) => {
        console.log(`${motorfader.widgetId} untouched`);
      });

      w.on(MotorFaderEvents.UPDATED, (motorfader, val) => {
        console.log(`${motorfader.widgetId} updated to ${val}`);
      });
    });
  });
});

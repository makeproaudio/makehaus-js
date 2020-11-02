/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

const { hub, Tile, EncoderEvents } = require('..');

hub.init('localhost', '8192');
[Tile.ENCODER8, Tile.ENCODER12].forEach((type) => {
  hub.on(type, (tile) => {
    console.log('New Encoder tile found. Fiddle with your encoder to see events');
    tile.widgets.forEach((w) => {
      w.on(EncoderEvents.PRESSED, (encoder) => {
        console.log(`${encoder.widgetId} pressed`);
      });

      w.on(EncoderEvents.RELEASED, (encoder) => {
        console.log(`${encoder.widgetId} released`);
      });

      w.on(EncoderEvents.LEFT, (encoder, val) => {
        console.log(`${encoder.widgetId} moved left by ${val}`);
      });

      w.on(EncoderEvents.RIGHT, (encoder, val) => {
        console.log(`${encoder.widgetId} moved right by ${val}`);
      });

      w.on(EncoderEvents.TOUCHED, (encoder) => {
        console.log(`${encoder.widgetId} touched`);
      });

      w.on(EncoderEvents.UNTOUCHED, (encoder) => {
        console.log(`${encoder.widgetId} untouched`);
      });
    });
  });
});

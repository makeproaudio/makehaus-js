/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { Tile } from './control/api-base';
import { TileLedButton12, TileLedButton8 } from './control/api-butled';
import { LedButton } from './tcwidget/ledbutton';
import { TileFader4 } from './control/api-fader';
import { TileEncoder8, TileEncoder12 } from './control/api-encoder';
import { EncoderEvents } from './tcwidget/encoder';
import randomColor from 'randomcolor';

class AutoAnimate {
  start = (hub: any) => {
    console.log('Entered AutoAnimation Mode');
    hub.on(Tile.ENCODER8, (tile: TileEncoder8) => {
      faderAnimator.setEncoderTile(tile);
      buttonAnimator.setEncoderTile(tile);
    });
    hub.on(Tile.ENCODER12, (tile: TileEncoder12) => {
      faderAnimator.setEncoderTile(tile);
      buttonAnimator.setEncoderTile(tile);
    });
    hub.on(Tile.MOTORFADER4, (tile: TileFader4) => {
      faderAnimator.setFaderTile(tile);
    });
    hub.on(Tile.LEDBUTTON8, (tile: TileLedButton12) => {
      buttonAnimator.setButtonTile(tile);
    });
    hub.on(Tile.LEDBUTTON12, (tile: TileLedButton12) => {
      buttonAnimator.setButtonTile(tile);
    });
  };
}

class EncoderFaderAnimator {
  faderTiles: TileFader4[] = [];

  setFaderTile(tile: TileFader4) {
    this.faderTiles.push(tile);
  }

  setEncoderTile(tile: TileEncoder8 | TileEncoder12) {
    tile.widgets.forEach((w) => {
      w.on(EncoderEvents.RIGHT, (encoder) => {
        this.faderTiles.forEach((faderTile) => {
          const fader = faderTile.widgets[tile.widgets.indexOf(w) % 4];
          if (fader) {
            fader.setValue(fader.getValue() + 1000);
          }
        });
      });
    });
    tile.widgets.forEach((w) => {
      w.on(EncoderEvents.LEFT, (encoder) => {
        this.faderTiles.forEach((faderTile) => {
          const fader = faderTile.widgets[tile.widgets.indexOf(w) % 4];
          if (fader) {
            fader.setValue(fader.getValue() - 1000);
          }
        });
      });
    });
  }
}

class EncoderButtonAnimator {
  buttonTile: TileLedButton12[] | TileLedButton8[] = [];

  setButtonTile(tile: TileLedButton12 | TileLedButton8) {
    this.buttonTile.push(tile);
  }

  setEncoderTile(tile: TileEncoder8 | TileEncoder12) {
    tile.widgets.forEach((w) => {
      w.on(EncoderEvents.RELEASED, (encoder) => {
        this.buttonTile.forEach((buttonTile) => {
          buttonTile.widgets.forEach((b: LedButton) => {
            b.setColor(ColorCyler.nextRandom());
          });
        });
      });
    });
  }
}

class ColorCyler {
  static nextRandom = (): string => {
    const color: string = randomColor();
    const sliced = color.slice(1, color.length);
    return sliced;
  };
}

const faderAnimator: EncoderFaderAnimator = new EncoderFaderAnimator();
const buttonAnimator: EncoderButtonAnimator = new EncoderButtonAnimator();

export const autoAnimate: AutoAnimate = new AutoAnimate();
Object.seal(autoAnimate);

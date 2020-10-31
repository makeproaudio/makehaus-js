/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { TCWidget, TCWidgetListener } from './tcwidget-base';
import { TileButLedComponents, TileButLedCommands } from '../control/api-butled';
import { MessageType } from '../control/hub';
import { WidgetType } from '../widget/widget';
import _ from 'lodash';

export class LedButton extends TCWidget {
  evtSubject: any;
  private color: string;
  constructor(chainId: string, boardType: string, boardIdx: number, idx: number, evtSubject: any) {
    super(chainId, boardType, boardIdx, idx, WidgetType.LEDBUTTON);
    this.evtSubject = evtSubject;
    this.color = '';
  }

  _setProperty(prop: string, val: string): void {
    if (prop === 'COLOR') this.setColor(val);
  }

  setColor(color: string) {
    this.color = color;
    /* Create the Control Event to change the color type and pass it to the event stream for processing */
    this.evtSubject.next({
      cmd: TileButLedCommands.COLOR,
      com: TileButLedComponents.LED,
      idx: this.widgetId - 1,
      msg_type: MessageType.EVENT,
      chain_id: this.chainId,
      board_type: this.boardType,
      board_idx: this.tileId - 1,
      val: this.hexColorFromString(color),
    });
  }

  /* A wrapper method for updating the color of an LED using the HSL convention */
  setHsl(hue: number, saturation: number, lightness: number) {
    if (hue < 0 || hue > 360 || saturation < 0 || saturation > 1 || lightness < 0 || lightness > 1) {
      console.log('received invalid arguments for hsl');
    } else {
      this.setColor(this.hslToRgb(hue, saturation, lightness));
    }
  }

  hslToRgb = (hue: number, saturation: number, lightness: number): string => {
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    let huePrime = hue / 60;
    const secondComponent = chroma * (1 - Math.abs((huePrime % 2) - 1));

    huePrime = Math.floor(huePrime);
    let red;
    let green;
    let blue;

    if (huePrime === 0) {
      red = chroma;
      green = secondComponent;
      blue = 0;
    } else if (huePrime === 1) {
      red = secondComponent;
      green = chroma;
      blue = 0;
    } else if (huePrime === 2) {
      red = 0;
      green = chroma;
      blue = secondComponent;
    } else if (huePrime === 3) {
      red = 0;
      green = secondComponent;
      blue = chroma;
    } else if (huePrime === 4) {
      red = secondComponent;
      green = 0;
      blue = chroma;
    } else if (huePrime === 5) {
      red = chroma;
      green = 0;
      blue = secondComponent;
    }

    const lightnessAdjustment = lightness - chroma / 2;
    red += lightnessAdjustment;
    green += lightnessAdjustment;
    blue += lightnessAdjustment;

    return (
      '#' +
      _.padStart(Math.round(red * 255).toString(16), 2, '0') +
      _.padStart(Math.round(green * 255).toString(16), 2, '0') +
      _.padStart(Math.round(blue * 255).toString(16), 2, '0')
    );
  };

  startFlash(destinationColor: string, repCount: number, periodBefore: number, periodDestination: number, periodAfter: number, periodSource: number) {
    this.evtSubject.next({
      cmd: TileButLedCommands.FLASH,
      com: TileButLedComponents.LED,
      idx: this.widgetId,
      msg_type: MessageType.EVENT,
      nid: this.tileId,
      val: this.hexColorFromString(destinationColor),
      ext: { per_aft: periodAfter, per_bef: periodBefore, per_dst: periodDestination, per_src: periodSource, rep_cnt: repCount },
    });
  }

  stopFlash() {
    this.evtSubject.next({
      cmd: TileButLedCommands.FLASHSTOP,
      com: TileButLedComponents.LED,
      idx: this.widgetId,
      msg_type: MessageType.EVENT,
      nid: this.tileId,
      val: -1,
    });
  }

  getColor(): string {
    return this.color;
  }

  // ToDo: create color names map
  private hexColorFromString = (color: string): number => {
    // parse hex or decimal color value from string
    if (!(color && typeof color == 'string')) {
      throw Error(`No valid color given, received ${typeof color}`);
    }
    const colval = color.startsWith('#') ? parseInt(color.slice(1), 16) : parseInt(color);
    if (isNaN(colval)) {
      // ToDo: lookup color value from color names map
    }
    return colval;
  };
}

export interface ButtonListener extends TCWidgetListener {
  onButtonPressed(button: LedButton): void;
  onButtonReleased(button: LedButton, duration: number): void;
}

export const LedButtonEvents = {
  PRESSED: 'pressed',
  RELEASED: 'released',
};

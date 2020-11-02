/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { TileBase, Tile, BoardType } from './api-base';
import { filter } from 'rxjs/operators';
import { NextObserver } from 'rxjs';
import { LedButton, ButtonListener, LedButtonEvents } from '../tcwidget/ledbutton';
import { client } from './client';

/* The abstract base class for all LedButton boards, i.e TileLedButton8 and TileLedButton12 */
abstract class TileLedButton extends TileBase<LedButton> {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileType: Tile, tileIndex: number, size: number) {
    super(evtSubject, chainId, boardType, tileType, tileIndex, size);

    /* Spawn the Widget objects for this tile type */
    for (let i = 0; i < this.size; i++) {
      this.widgets.push(new LedButton(this.chainId(), this.boardType(), this.tileIndex(), i, evtSubject));
    }

    /* Set up the Control Event filters for the stream */
    const buttonFiltered = this.evtSubject.pipe(
      filter((ev: ControlEvent) => {
        return (ev.com === TileButLedComponents.BUTTON || ev.com === TileButLedComponents.LED) && this.isMine(ev);
      })
    );

    /* Start creating the subscribers to each filtered stream. For example, when a Button is pressed, the buttonPressed callback will be triggered*/
    buttonFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileButLedCommands.PRESSED)).subscribe(this.buttonPressed);
    buttonFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileButLedCommands.RELEASED)).subscribe(this.buttonReleased);

    /* For all commands that send data to the hardware widgets, such as updating the color, making the LED flash, we set up a generic forward-as-is handler and assume the higher classes will compose the message appropriately.*/
    buttonFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileButLedCommands.COLOR)).subscribe(this.forwardAsIs);
    buttonFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileButLedCommands.FLASH)).subscribe(this.forwardAsIs);
    buttonFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileButLedCommands.FLASHSTOP)).subscribe(this.forwardAsIs);
  }

  buttonPressed: NextObserver<ControlEvent> = {
    next: (what) => {
      /* Find the widget that corresponds to the hardware button which was pressed and cast it to the correct Widget type. */
      const widget = this.widgets[what.idx] as LedButton;

      /* Every Widget is an event emitter - on that widget, emit the fact that the PRESSED event was triggered and pass the widget as data */
      widget.emit(LedButtonEvents.PRESSED, widget);
      widget.widgetListeners.forEach((l) => {
        const buttonListener = l as ButtonListener;
        buttonListener.onButtonPressed(widget);
      });
    },
  };

  buttonReleased: NextObserver<ControlEvent> = {
    next: (what) => {
      const widget = this.widgets[what.idx] as LedButton;
      widget.emit(LedButtonEvents.RELEASED, widget);
      widget.widgetListeners.forEach((l) => {
        const buttonListener = l as ButtonListener;
        buttonListener.onButtonReleased(widget, what.val);
      });
    },
  };

  forwardAsIs: NextObserver<ControlEvent> = {
    next: (what) => {
      client.send(what);
    },
  };
}

export const TileButLedCommands = {
  PRESSED: 'PRESSED',
  RELEASED: 'RELEASED',
  COLOR: 'COLOR',
  FLASH: 'FLASH',
  FLASHSTOP: 'FLASH_STOP',
};

export const TileButLedComponents = {
  BUTTON: 'BUTTON',
  LED: 'RGB_LED',
};

/* Concrete classes for LedButton type */
export class TileLedButton12 extends TileLedButton {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileIndex: number) {
    /*the only concretization done here is in the size of the board type.*/
    super(evtSubject, chainId, boardType, Tile.LEDBUTTON12, tileIndex, 12);
  }
}

export class TileLedButton8 extends TileLedButton {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileIndex: number) {
    super(evtSubject, chainId, boardType, Tile.LEDBUTTON8, tileIndex, 8);
  }
}

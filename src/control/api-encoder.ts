/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { TileBase, Tile, BoardType } from './api-base';
import { filter } from 'rxjs/operators';
import { NextObserver } from 'rxjs';
import { defaultEncoderAccelarator } from './encoder-accelerator';
import { Encoder, EncoderListener, EncoderEvents } from '../tcwidget/encoder';
import { ControlEvent } from './model';

abstract class TileEncoder extends TileBase<Encoder> {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileType: Tile, tileIndex: number, size: number, comIdentifier: string) {
    super(evtSubject, chainId, boardType, tileType, tileIndex, size);
    for (let i = 0; i < this.size; i++) {
      this.widgets.push(new Encoder(this.chainId(), this.boardType(), this.tileIndex(), i));
    }
    const encoderButtonFiltered = this.evtSubject.pipe(filter((ev: ControlEvent) => ev.com === TileEncoderComponents.BUTTON && this.isMine(ev)));
    const encoderEncoderFiltered = this.evtSubject.pipe(filter((ev: ControlEvent) => ev.com === comIdentifier && this.isMine(ev)));

    encoderEncoderFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileEncoderCommands.TOUCHED)).subscribe(this.encoderTouched);
    encoderEncoderFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileEncoderCommands.UNTOUCHED)).subscribe(this.encoderUntouched);
    encoderButtonFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileEncoderCommands.PRESSED)).subscribe(this.encoderPressed);
    encoderButtonFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileEncoderCommands.RELEASED)).subscribe(this.encoderReleased);
    encoderEncoderFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileEncoderCommands.RIGHT)).subscribe(this.encoderTurnedRight);
    encoderEncoderFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileEncoderCommands.LEFT)).subscribe(this.encoderTurnedLeft);
  }

  trueIndex(index: number) {
    return index % this.size;
  }

  private encoderTouched: NextObserver<ControlEvent> = {
    next: what => {
      const widget = this.widgets[this.trueIndex(what.idx)];
      widget.emit(EncoderEvents.TOUCHED, widget);
      widget.widgetListeners.forEach(l => {
        const encoderListener = l as EncoderListener;
        encoderListener.onEncoderTouched(widget);
      });
    },
  };

  private encoderUntouched: NextObserver<ControlEvent> = {
    next: what => {
      const widget = this.widgets[this.trueIndex(what.idx)];
      widget.emit(EncoderEvents.UNTOUCHED, widget);
      widget.widgetListeners.forEach(l => {
        const encoderListener = l as EncoderListener;
        encoderListener.onEncoderUntouched(widget);
      });
    },
  };

  private encoderPressed: NextObserver<ControlEvent> = {
    next: what => {
      const widget = this.widgets[this.trueIndex(what.idx)];
      widget.emit(EncoderEvents.PRESSED, widget);
      widget.widgetListeners.forEach(l => {
        const encoderListener = l as EncoderListener;
        encoderListener.onEncoderPressed(widget);
      });
    },
  };

  private encoderReleased: NextObserver<ControlEvent> = {
    next: what => {
      const widget = this.widgets[this.trueIndex(what.idx)];
      widget.emit(EncoderEvents.RELEASED, widget);
      widget.widgetListeners.forEach(l => {
        const encoderListener = l as EncoderListener;
        encoderListener.onEncoderReleased(widget);
      });
    },
  };

  private encoderTurnedRight: NextObserver<ControlEvent> = {
    next: what => {
      const widget = this.widgets[this.trueIndex(what.idx)];
      const accl = this.getAcceleratedValue(what.val);
      widget.emit(EncoderEvents.RIGHT, widget, accl);
      widget.widgetListeners.forEach(l => {
        const encoderListener = l as EncoderListener;
        encoderListener.onEncoderTurnedRight(widget, accl);
      });
    },
  };

  private encoderTurnedLeft: NextObserver<ControlEvent> = {
    next: what => {
      const widget = this.widgets[this.trueIndex(what.idx)];
      const accl = this.getAcceleratedValue(what.val);
      widget.emit(EncoderEvents.LEFT, widget, accl);
      widget.widgetListeners.forEach(l => {
        const encoderListener = l as EncoderListener;
        encoderListener.onEncoderTurnedLeft(widget, accl);
      });
    },
  };

  private getAcceleratedValue = (period: number): number => {
    period = Math.floor(period / 16);
    return period < defaultEncoderAccelarator.samples ? defaultEncoderAccelarator.encoderLevels[period] : 1;
  };
}

export const TileEncoderCommands = {
  TOUCHED: 'TOUCHED',
  UNTOUCHED: 'UNTOUCHED',
  PRESSED: 'PRESSED',
  RELEASED: 'RELEASED',
  RIGHT: 'TURNED_RIGHT',
  LEFT: 'TURNED_LEFT',
};

export const TileEncoderComponents = {
  BUTTON: 'BUTTON',
};

export class TileEncoder8 extends TileEncoder {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileIndex: number) {
    super(evtSubject, chainId, boardType, Tile.ENCODER8, tileIndex, 8, 'ENCODER');
  }
}

export class TileEncoder12 extends TileEncoder {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileIndex: number) {
    super(evtSubject, chainId, boardType, Tile.ENCODER12, tileIndex, 12, 'ENCODER');
  }
}

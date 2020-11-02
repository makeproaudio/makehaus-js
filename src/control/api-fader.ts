/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { TileBase, Tile, BoardType } from './api-base';
import { filter } from 'rxjs/operators';
import { NextObserver } from 'rxjs';
import { MotorFader, FaderListener, MotorFaderEvents } from '../tcwidget/motorfader';
import { client } from './client';

abstract class TileFader extends TileBase<MotorFader> {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileType: Tile, tileIndex: number, size: number) {
    super(evtSubject, chainId, boardType, tileType, tileIndex, size);
    for (let i = 0; i < this.size; i++) {
      this.widgets.push(new MotorFader(this.chainId(), this.boardType(), this.tileIndex(), i, evtSubject));
    }
    const faderFiltered = this.evtSubject.pipe(
      filter((ev: ControlEvent) => {
        return ev.com === TileFaderComponents.MOTORFADER && this.isMine(ev);
      })
    );
    faderFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileFaderCommands.TOUCHED)).subscribe(this.faderTouched);
    faderFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileFaderCommands.UNTOUCHED)).subscribe(this.faderReleased);
    faderFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileFaderCommands.UPDATED)).subscribe(this.faderUpdated);
    faderFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === TileFaderCommands.UPDATE)).subscribe(this.setFaderValue);
  }

  faderTouched: NextObserver<ControlEvent> = {
    next: (what) => {
      const widget = this.widgets[what.idx] as MotorFader;
      widget.emit(MotorFaderEvents.TOUCHED, widget);
      widget.widgetListeners.forEach((l) => {
        const faderListener = l as FaderListener;
        faderListener.onFaderTouched(widget, what.val);
      });
    },
  };

  faderReleased: NextObserver<ControlEvent> = {
    next: (what) => {
      const widget = this.widgets[what.idx] as MotorFader;
      widget.emit(MotorFaderEvents.UNTOUCHED, widget);
      widget.widgetListeners.forEach((l) => {
        const faderListener = l as FaderListener;
        faderListener.onFaderUntouched(widget, what.val);
      });
    },
  };

  faderUpdated: NextObserver<ControlEvent> = {
    next: (what) => {
      const widget = this.widgets[what.idx] as MotorFader;
      widget.emit(MotorFaderEvents.UPDATED, widget, what.val);
      widget.widgetListeners.forEach((l) => {
        const faderListener = l as FaderListener;
        faderListener.onFaderUpdated(widget, what.val);
      });
    },
  };

  setFaderValue: NextObserver<ControlEvent> = {
    next: (what) => {
      client.send(what);
    },
  };
}

export const TileFaderCommands = {
  TOUCHED: 'TOUCHED',
  UNTOUCHED: 'UNTOUCHED',
  UPDATED: 'UPDATED',
  UPDATE: 'UPDATE',
};

export const TileFaderComponents = {
  MOTORFADER: 'MOTORFADER',
};

export class TileFader4 extends TileFader {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileIndex: number) {
    super(evtSubject, chainId, boardType, Tile.MOTORFADER4, tileIndex, 4);
  }
}

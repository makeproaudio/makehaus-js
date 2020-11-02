/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { TextLcdDisplay } from '../tcwidget/textlcddisplay';
import { TileBase, Tile, BoardType } from './api-base';
import { filter } from 'rxjs/operators';
import { NextObserver } from 'rxjs';
import { client } from './client';
import { ControlEvent } from './model';

abstract class TileTextLcdDisplay extends TileBase<TextLcdDisplay> {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileType: Tile, tileIndex: number, size: number) {
    super(evtSubject, chainId, boardType, tileType, tileIndex, size);
    for (let i = 0; i < this.size; i++) {
      const display = new TextLcdDisplay(this.chainId(), this.boardType(), this.tileIndex(), i, evtSubject);
      this.widgets.push(display);
      this.setup(i);
      display.sayHello();
    }
    const displayFiltered = this.evtSubject.pipe(
      filter((ev: ControlEvent) => {
        return ev.com === TileTextLcdDisplayComponents.TEXTLCDDISPLAY && this.isMine(ev);
      })
    );
    displayFiltered.pipe(filter((ev: ControlEvent) => ev.cmd === 'TXT-CENTER-LEFT')).subscribe(this.setText);
  }

  setText: NextObserver<ControlEvent> = {
    next: what => {
      client.send(what);
    },
  };

  setBar: NextObserver<ControlEvent> = {
    next: what => {
      client.send(what);
    },
  };

  private setup(idx: number) {
    client.send({
      cmd: 'SETUP',
      com: 'ST7032',
      msg_type: 'event',
      nid: this.tileIndex(),
      idx: idx,
      val: 0,
      ext: [
        { row: 0, col: 0, len: 16 },
        { row: 1, col: 0, len: 16 },
      ],
    });
  }
}

export class TileTextLcdDisplayDual extends TileTextLcdDisplay {
  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileIndex: number) {
    super(evtSubject, chainId, boardType, Tile.TEXTLCDDISPLAYDUAL, tileIndex, 2);
  }
}

export const TileTextLcdDisplayComponents = {
  TEXTLCDDISPLAY: 'ST7032',
};

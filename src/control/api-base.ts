/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { ReplaySubject } from 'rxjs';
import { TCWidget } from '../tcwidget/tcwidget-base';
import { ControlEvent } from './model';

abstract class ControlEventProcessor {
  constructor(evtSubject: ReplaySubject<ControlEvent>) {
    this.evtSubject = evtSubject;
  }

  /*
   * Working around https://github.com/ReactiveX/rxjs/issues/4659
   */
  evtSubject: any;
}

/* This is the abstract base class for all Tile types
 * Each Board Type is represented by its own class in the TileBase hierarchy.*/
export abstract class TileBase<T extends TCWidget> extends ControlEventProcessor {
  private _tileIndex: number;
  private _chainId: string;
  private _tileType: Tile;
  private _boardType: BoardType;
  size: number;
  widgets: T[] = [];

  constructor(evtSubject: any, chainId: string, boardType: BoardType, tileType: Tile, tileIndex: number, size: number) {
    super(evtSubject);
    this._chainId = chainId;
    this._boardType = boardType;
    this._tileType = tileType;
    this._tileIndex = tileIndex;
    this.size = size;
  }

  tileIndex = (): number => {
    return this._tileIndex;
  };

  chainId = (): string => {
    return this._chainId;
  };

  tileType = (): Tile => {
    return this._tileType;
  };

  boardType = (): BoardType => {
    return this._boardType;
  };

  isMine = (ev: ControlEvent): boolean => {
    return ev.board_idx === this.tileIndex() && ev.chain_id === this.chainId() && ev.board_type === this.boardType();
  };
}

export enum Tile {
  ENCODER8 = '8E',
  ENCODER12 = '12E',
  LEDBUTTON8 = '8B',
  LEDBUTTON12 = '12B',
  MOTORFADER4 = '4F',
  ENCODER8TICKLESS = 'E8T',
  TEXTLCDDISPLAYDUAL = 'TXTLCD',
}

export enum BoardType {
  TILEBUTLED12 = 'UIM_12RGB_12BUT',
  TILEBUTLED8 = 'UIM_8RGB_8BUT',
  TILEENCODER12 = 'UIM_12ENC_12BUT',
  TILEENCODER8 = 'UIM_8ENC_8BUT',
  TILEENCODER8TICKLESS = 'UIM_8ENC_8BUT__ENC_NOTICK',
  TILEFADER4 = 'UIM_4FAD',
  TILETEXTLCDDUALDISPLAY = 'UIM_2TXTLCD',
}

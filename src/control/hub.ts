/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { client } from './client';
import { TileBase, BoardType } from './api-base';
import { TileLedButton12, TileLedButton8 } from './api-butled';
import { TileEncoder12, TileEncoder8 } from './api-encoder';
import { ReplaySubject } from 'rxjs';
import { EventEmitter } from 'events';
import { TCWidget } from '../tcwidget/tcwidget-base';
import { TileFader4 } from './api-fader';
import { TileTextLcdDisplayDual } from './api-textlcddisplay';
import { Stacks } from '../stack/stacks';
import { StackBase } from '../stack/stack';

export class Hub extends EventEmitter {
  /* Create a Stream where the type of messages we will be handling is of type ControlEvent */
  private subject = new ReplaySubject<ControlEvent>();

  /* The TileBase class is the abstract base class for all Tile types. */
  private tiles: TileBase<TCWidget>[] = [];
  private inited: boolean = false;

  private dataCallback = (json: any) => {
    let what;

    /* there may be different types of messages coming in from the hub. Refer to the MessageType enum for a complete list*/
    if (json.msg_type === MessageType.CHAININIT) {
      if (this.inited === true) {
        /* Check whether the hub proxy has already been inited and avoid reinitialization */
        console.log('Tile Chain was reconnected to hub. Avoiding reinitialization');
        Stacks.getAll().forEach(stack => {
          const stackbase = stack as StackBase;
          stackbase.sync();
        });
        return;
      }

      /* Currently supports only a single Tile Chain connected to the Hub */
      console.log('Found a Tile Chain connected to hub.');
      this.inited = true;
      what = json as ChainInit;
      let tile: TileBase<TCWidget>;

      /* Depending on the board info, create different base objects. Refer to TileBase and its
       * derivate classes for further information */
      what.board_infos.forEach(boardInfo => {
        switch (boardInfo.board_type) {
          case BoardType.TILEBUTLED12:
            tile = new TileLedButton12(this.subject, what.chain_id, boardInfo.board_type, boardInfo.board_idx);
            break;
          case BoardType.TILEBUTLED8:
            tile = new TileLedButton8(this.subject, what.chain_id, boardInfo.board_type, boardInfo.board_idx);
            break;
          case BoardType.TILEENCODER12:
            tile = new TileEncoder12(this.subject, what.chain_id, boardInfo.board_type, boardInfo.board_idx);
            break;
          case BoardType.TILEENCODER8:
            tile = new TileEncoder8(this.subject, what.chain_id, boardInfo.board_type, boardInfo.board_idx);
            break;
          case BoardType.TILEFADER4:
            tile = new TileFader4(this.subject, what.chain_id, boardInfo.board_type, boardInfo.board_idx);
            break;
          case BoardType.TILETEXTLCDDUALDISPLAY:
            tile = new TileTextLcdDisplayDual(this.subject, what.chain_id, boardInfo.board_type, boardInfo.board_idx);
            break;
          default:
            break;
        }

        /* cache the tile and forward the information that a new tile was discovered via events */
        if (tile) {
          this.tiles.push(tile);
          this.emit(tile.tileType().toString(), tile);
        }
      });
    } else if (json.msg_type === MessageType.EVENT) {
      what = json as ControlEvent;

      /* If the message type is an EVENT, pass the message to the event Stream to process */
      this.subject.next(what);
    } else if (json.msg_type === MessageType.CHAINEXIT) {
      /* Don't do anything special in the disconnect section. This is currently matching the implementation on the Tiles Hub*/
      console.log('Tile Chain was disconnected from Hub');
    }
  };

  init = async (host: string, port: number) => {
    return new Promise<void>((resolve, reject) => {

      /* Start listening to the client for events. */
      client.start(host, port);

      /* Register event handlers for different event types on the server. */
      client.on('error', (e: any) => {
        console.log('error %s', e);
        reject(e);
      });
      client.on('connect', () => {
        console.log('Connection established to hub');
        resolve();
      });
      client.on('close', (e: any) => console.log('close %s', e));

      /* register a data callback which is used as a high speed lane for all significant events */
      client.on('data', (json: any) => this.dataCallback(json));
    });
  };
}

export const MessageType = {
  CHAININIT: 'chain-init',
  CHAINEXIT: 'chain-exit',
  EVENT: 'event',
};

export const hub: Hub = new Hub();
Object.seal(hub);

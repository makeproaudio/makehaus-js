/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { WidgetType, WidgetBase } from '../widget/widget';

export abstract class TCWidget extends WidgetBase {
  chainId: string;
  boardType: string;
  widgetId: number;
  tileId: number;
  widgetListeners: TCWidgetListener[] = [];

  constructor(chainId: string, boardType: string, boardId: number, widgetId: number, type: WidgetType) {
    super('', type);
    this.chainId = chainId;
    this.boardType = boardType;
    this.tileId = boardId + 1;
    this.widgetId = widgetId + 1;
  }

  addTCWListener(listener: TCWidgetListener) {
    this.widgetListeners.push(listener);
  }

  removeTCWListener(listener: any) {
    const index = this.widgetListeners.findIndex((val) => listener === val);
    if (index > -1) {
      this.widgetListeners = this.widgetListeners.splice(index, 1);
    }
  }

  abstract _setProperty(prop: string, val: any, data?: any): void;
}

export interface TCWidgetListener {}

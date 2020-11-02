/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { hub } from '../control/hub';
import { Tile, TileBase } from '../control/api-base';
import { TCWidget } from './tcwidget-base';
import { filter } from 'rxjs/operators';
import { ReplaySubject } from 'rxjs';

class TCWidgetManager {
  hubs: Map<string, HubWidgetHolder> = new Map();

  getWhenAvailable = (request: TCWidgetRequest, callback: (response: TCWidgetResponse) => void) => {
    this.getInitedHubWidgetHolder(request.host, request.port)!.subscribe(request.identifier, callback);
  };

  getInitedHubWidgetHolder = (host: string, port: number): HubWidgetHolder | undefined => {
    const key = { host, port };
    const initedHub = this.hubs.get(JSON.stringify(key));
    if (!initedHub) {
      const hwh = new HubWidgetHolder(host, port);
      this.hubs.set(JSON.stringify(key), hwh);
      return hwh;
    }
    return initedHub;
  };
}

export const TileChainWidgetManager = new TCWidgetManager();
Object.seal(TileChainWidgetManager);

class HubWidgetHolder {
  private host: string;
  private port: number;
  /*
   * Working around https://github.com/ReactiveX/rxjs/issues/4659
   */
  private evtSubject: any = new ReplaySubject<{ widget: TCWidget; tile: TileBase<any> }>();

  constructor(host: string, port: number) {
    hub.init(host, port);
    this.host = host;
    this.port = port;
    this.init();
  }

  subscribe = (identifier: string, callback: (tcWidgetResponse: TCWidgetResponse) => void) => {
    this.evtSubject.pipe(filter((tcw: { widget: TCWidget; tile: TileBase<any> }) => this.identifierForWidget(tcw) === identifier)).subscribe({
      next: (value: { widget: TCWidget; tile: TileBase<any> }) => {
        const host = this.host;
        const port = this.port;
        const tcwidget = value.widget;
        callback({ host, port, identifier, tcwidget });
      },
    });
  };

  identifierForWidget = (tcw: { widget: TCWidget; tile: TileBase<any> }): string => {
    const indexOfTile = tcw.tile.tileIndex() + 1;
    const rowNumber = Math.floor((tcw.widget.widgetId - 1) / 4) + 1;
    const widgetNumber = ((tcw.widget.widgetId - 1) % 4) + 1;
    return tcw.tile.tileType() + '.' + indexOfTile + '.' + rowNumber + '.' + widgetNumber;
  };

  init = () => {
    Object.values(Tile).forEach((t) => {
      hub.on(t, (tile: TileBase<any>) => {
        tile.widgets.forEach((widget: TCWidget) => {
          this.evtSubject.next({ widget, tile });
        });
      });
    });
  };
}

export interface TCWidgetRequest {
  host: string;
  port: number;
  identifier: string;
}

export interface TCWidgetResponse {
  host: string;
  port: number;
  identifier: string;
  tcwidget: TCWidget;
}

/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import cors from 'cors';
import express from 'express';
import { createServer, Server } from 'http';
import socketio from 'socket.io';
import { Rows } from '../row/rows';
import { Stacks } from '../stack/stacks';
import { Stack, StackBase, StackEventType } from '../stack/stack';
import { UILayout } from '../models/model';
import { WidgetType, UIWidget, WidgetEventType, UIWidgetTypes, WidgetBase } from '../widget/widget';
import { UIStack } from '../stack/stack';
import { UIRow } from '../row/row';
import { Widgets } from '../widget/widgets';

class UIManager {
  socket: any;
  callbacks: Map<string, Function[]> = new Map();

  receiveEvent = (data) => {
    if (this.socket) {
      this.socket.emit('rx', data);
    }
  };

  refresh = () => {
    if (this.socket) {
      this.socket.emit('brute-force-refresh', '');
    }
  };

  private app: express.Application;
  private server: Server;
  private io: SocketIO.Server;
  private title: string = '';

  init = (websocketPort: number) => {
    this.listen(websocketPort);
  };

  setTitle = (title: string) => {
    this.title = title;
  };

  constructor() {
    /* create an express application to be able to open a websocket.*/
    this.app = express();
    this.app.use(cors());
    this.app.options('*', cors());

    /* Create a Server application */
    this.server = createServer(this.app);

    /* Open a websocket with the server just created */
    this.io = socketio(this.server);
  }

  /* Go through the Rows/Stacks/Widgets hierarchy and construct a corresponding hierarchy which can be interpreted by the UI
  This is a heavy lifting, setup time only function */
  private getUILayoutJSON = (): UILayout => {
    let maxInRow = -1;
    let uiLayout: UILayout = { title: this.title, rows: [] };
    Array.from(Rows.getAll()).forEach((row) => {
      const uiRow: UIRow = { name: row.name(), weight: row.weight(), stacks: [] };
      row.stacks().forEach((stack) => {
        const stackBase: StackBase = stack as StackBase;
        const uiStack: UIStack = {
          name: stackBase.name(),
          context: stackBase.parameter()!.getMetadata('context'),
          label: stackBase.parameter()!.getMetadata('label') === '' ? stackBase.name() : stackBase.parameter()!.getMetadata('label'),
          widgets: [],
          color: stackBase.parameter()!.getMetadata('color'),
          value: stackBase.parameter()!.value(),
        };
        if (stackBase.parameter()!.getMetadata('max')) {
          uiStack.max = stackBase.parameter()!.getMetadata('max');
          uiStack.min = stackBase.parameter()!.getMetadata('min');
        } else if (stackBase.parameter()!.getMetadata('values')) {
          uiStack.values = stackBase.parameter()!.getMetadata('values');
        }
        const widgets = stack.widgets().filter((w) => {
          return UIWidgetTypes.includes(w.type());
        });
        widgets.forEach((widget) => {
          const uiWidget: UIWidget = { name: widget.name(), type: widget.type(), weight: widget.weight() === undefined ? 1 : widget.weight()! };
          uiStack.widgets.push(uiWidget);
        });
        uiRow.stacks.push(uiStack);
      });
      if (uiRow.stacks.length > maxInRow) maxInRow = uiRow.stacks.length;
      uiLayout.rows.push(uiRow);
    });
    return uiLayout;
  };

  /* Register a listener on the Port specified and listen on topics. */
  private listen(port: number): void {
    this.server.listen(port, '0.0.0.0', () => {
      console.log(`Server running on port ${port}. Specify this in your UI as required.`);
    });

    /* Disallow using the application for any standard HTTP purposes */
    this.app.get('/', (req, res) => {
      res.send().status(401);
    });

    /* Register a connection listener */
    this.io.on('connect', (socket: any) => {
      this.socket = socket;
      console.log('Connected client on port %s.', port);

      /* A client willing to speak to this server will speak on the 'client' topic */
      socket.on('client', () => {
        console.log(`Received client request`);
        this.io.sockets.emit('client-ready', 1);
        console.log('Sent client response: 1');

        /* Use the 'data' topic for standard events related communication */
        socket.on('data', (clientId: number) => {
          console.log('Received layout request from client with ID=%d.', clientId);
          console.log(this.getUILayoutJSON());
          this.io.sockets.emit('data', this.getUILayoutJSON());
        });

        /* Typically, communication is directed from the server to the client in all but one use case:
         * Software buttons can implement specific functionality. To listen to a software UI Button being pressed
         * ,use the 'tx' topic */
        socket.on('tx', (data) => {
          const widget: WidgetBase | undefined = Widgets.get(data.widget.name) as WidgetBase;
          if (widget) {
            switch (widget.type()) {
              case WidgetType.BUTTON:
                if (data.widget.event === WidgetEventType.PRESS) {
                  widget.onPressed(false);
                }
                break;
              case WidgetType.SLIDER_HORIZONTAL:
              case WidgetType.SLIDER_VERTICAL:
                if (data.widget.event === WidgetEventType.CHANGE_ABSOLUTE) {
                  widget.onAbsoluteChange(data.widget.value);
                }
                break;
              default:
                break;
            }
          }
        });
      });
    });
  }
}

export const UI = new UIManager();

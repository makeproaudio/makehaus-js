/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

import { Layout, TileChain, Widget as WidgetModel, Row as RowModel, Stack as StackModel, WidgetEvent as WidgetModelEvent } from '../models/model';
import { Rows } from '../row/rows';
import { Stacks } from '../stack/stacks';
import { Widgets } from '../widget/widgets';
import { TileChainWidgetManager, TCWidgetResponse } from '../tcwidget/tcwidget-manager';
import { Widget, WidgetType, WidgetBase } from '../widget/widget';
import { UI } from '../ui/ui';
import { TCWidget } from '../tcwidget/tcwidget-base';
import { Encoder, EncoderEvents } from '../tcwidget/encoder';
import { StackBase } from '../stack/stack';
import { LedButton, LedButtonEvents } from '../tcwidget/ledbutton';
import { MotorFader, MotorFaderEvents } from '../tcwidget/motorfader';
import { Parameter, ParameterType } from '@makeproaudio/parameters-js';
import { Parameters } from '@makeproaudio/parameters-js';

class Layouter {
  /* Should be semaphore'd or countdown latched. Later*/

  /* Pass a Layout JSON string along with the port on which to start communicating with the MakeHaus Web UI
   * Since this operation is asynchronous, it accepts a callback function to report back to when the initialization
   * of the UI Widgets has been completed */
  getUIWidgets = (json: string, callback: () => void, websocketPort: number) => {
    const layout = json as Layout;
    if (layout.title) {
      UI.setTitle(layout.title);
    }
    /* Create the Rows/Stacks/UIWidgets object hierarchy */
    this.spawnRowsStacksUIWidgets(layout);
    callback();
    /* Dirty hack to wait for a little while before accepting messages from the UI */
    setTimeout(() => UI.init(websocketPort), 3000);
  };

  /* Pass a Layout JSON string and a callback function to asynchronously spawn TC Widgets when the remote
   * hub comes online */
  getTCWidgets = (json: string, callback: () => void) => {
    const layout = json as Layout;
    this.spawnTCWidgetsWhenAvailable(layout, callback);
  };

  /* Create the TCWidget object hierarchy */
  spawnTCWidgetsWhenAvailable = (layout: Layout, callback: () => void) => {
    if (layout.rows) {
      layout.rows.forEach((r: RowModel) => {
        if (r.widgetstacks) {
          r.widgetstacks.forEach((s: StackModel) => {
            if (s.widgets) {
              s.widgets.forEach((w: WidgetModel) => {
                const stackForWidget = Stacks.get(s.name)! as StackBase;
                this.spawnTCWidget(layout, w, stackForWidget, (widget: Widget) => {
                  stackForWidget.addWidget(widget);
                  stackForWidget.sync();
                  if (Array.from(this.expectedWidgets.values()).filter((val) => val === false).length === 0) {
                    callback();
                  }
                });
              });
            }
          });
        }
      });
    }
  };

  spawnForStack = (s: StackModel, stack: StackBase, layout: Layout) => {
    /* Create a new parameter for this Stack.
     *Do better validation here. Later on */
    let param: Parameter = Parameters.newParameter('', stack.name());
    if (s.max !== undefined && s.min !== undefined && s.step !== undefined) {
      param.updateType({ min: s.min, max: s.max, step: s.step, value: s.defaultValue, type: ParameterType.NUMBER });
    } else if (s.values) {
      /* Depending on the values mentioned in the layout*/
      switch (typeof s.values[0]) {
        case 'number':
          param.updateType({ values: s.values, value: s.defaultValue, type: ParameterType.NUMBER_ARRAY });
          break;
        case 'boolean':
          param.updateType({ value: s.defaultValue, type: ParameterType.BOOLEAN });
          break;
        case 'string':
          param.updateType({ values: s.values, value: s.defaultValue, type: ParameterType.STRING_ARRAY });
          break;
        default:
          break;
      }
    }
    if (s.color) {
      param.setMetadata('color', s.color);
    }
    param.setMetadata('label', s.label);
    param.setMetadata('context', s.context);
    stack.setParameter(param);
    if (s.widgets) {
      s.widgets.forEach((w: WidgetModel) => {
        const widget = this.spawnUIWidget(layout, w);
        if (widget) {
          try {
            stack.addWidget(widget);
          } catch (e) {}
        }
      });
    }
  };

  spawnRowsStacksUIWidgets = (layout: Layout) => {
    if (layout.rows) {
      layout.rows.forEach((r: RowModel) => {
        const row = Rows.createOrGet(r.name, r.weight === undefined ? 1 : r.weight);
        if (r.widgetstacks) {
          r.widgetstacks.forEach((s: StackModel) => {
            const stack: StackBase = Stacks.createOrGet(s.name) as StackBase;
            this.spawnForStack(s, stack, layout);
            try {
              row.addStack(stack);
            } catch (e) {}
          });
        }
      });
    }
  };

  expectedWidgets: Map<string, boolean> = new Map();

  spawnTCWidget = (layout: Layout, w: WidgetModel, stack: StackBase, callback: (tcw: Widget) => void) => {
    if (w.tilechain) {
      const { address: host, port } = layout.tilechains!.find((tc) => tc.name === w.tilechain!)! as TileChain;
      const identifier = w.identifier!;
      this.expectedWidgets.set(JSON.stringify({ host, port, identifier }), false);
      TileChainWidgetManager.getWhenAvailable({ host, port, identifier }, (tcwResponse: TCWidgetResponse) => {
        const widget = Widgets.createFromHardwareWidget(w.name, tcwResponse.tcwidget);
        this.bindTCWidgetEvents(widget as WidgetBase, tcwResponse.tcwidget, stack, w.event);
        const { host, port, identifier } = tcwResponse;
        this.expectedWidgets.set(JSON.stringify({ host, port, identifier }), true);
        callback(widget);
      });
    }
  };

  /* Here, the parser acts as an internal listener to TCWidget Events and maps them to abstract Widget API calls.
   * For every TCWidget created, bind the TCWidget event to the abstract Widget function */
  bindTCWidgetEvents = (widget: WidgetBase, tcw: TCWidget, stack: StackBase, evt: WidgetModelEvent) => {
    if (tcw.type() === WidgetType.ENCODER) {
      const enc: Encoder = tcw as Encoder;
      /* For example, if an encoder was touched, tell the Widget wrapper of this TC Widget that it was touched. */
      enc.on(EncoderEvents.TOUCHED, () => {
        widget.onTouched(true);
      });
      enc.on(EncoderEvents.UNTOUCHED, () => {
        widget.onTouched(false);
      });
      enc.on(EncoderEvents.LEFT, (button, val: number) => {
        if (evt === WidgetModelEvent.TURN) widget.onRelativeChange(-val);
      });
      enc.on(EncoderEvents.RIGHT, (button, val: number) => {
        if (evt === WidgetModelEvent.TURN) widget.onRelativeChange(val);
      });
      enc.on(EncoderEvents.PRESSED, () => {
        if (evt === WidgetModelEvent.PRESS) widget.onPressed(true);
      });
      enc.on(EncoderEvents.RELEASED, () => {
        if (evt === WidgetModelEvent.PRESS) widget.onPressed(false);
      });
    } else if (tcw.type() === WidgetType.LEDBUTTON) {
      const butled: LedButton = tcw as LedButton;
      butled.on(LedButtonEvents.PRESSED, () => {
        if (evt === WidgetModelEvent.PRESS) widget.onPressed(true);
      });
      butled.on(LedButtonEvents.RELEASED, () => {
        if (evt === WidgetModelEvent.PRESS) widget.onPressed(false);
      });
    } else if (tcw.type() === WidgetType.MOTORFADER) {
      const motorfader: MotorFader = tcw as MotorFader;
      motorfader.on(MotorFaderEvents.TOUCHED, () => {
        widget.onTouched(true);
      });
      motorfader.on(MotorFaderEvents.UNTOUCHED, () => {
        widget.onTouched(false);
      });
      motorfader.on(MotorFaderEvents.UPDATED, (w: MotorFader) => {
        widget.onAbsoluteChange(w.getRangedValue());
      });
    }
  };

  spawnUIWidget = (layout: Layout, w: WidgetModel) => {
    if (w.type) {
      return Widgets.createOrGet(w.name, w.type!, w.weight!);
    }
    return undefined;
  };
}

export const LayoutParser = new Layouter();
Object.seal(Layouter);

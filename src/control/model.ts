/*
This file is part of MakeHaus JS, the MakeHaus API for Node.js, released under AGPL-3.0 license.
(c) 2019, 2020 MakeProAudio GmbH and Node.js contributors. All rights reserved.
*/

export interface ChainInit {
  board_infos: [
    {
      board_type: string;
      firmware_id: string;
      board_idx: number;
    }
  ];
  chain_id: string;
  msg_type: string;
}

export interface ControlEvent {
  chain_id: string;
  board_type: string;
  board_idx: number;
  com: string;
  idx: number;
  cmd: string;
  val: number;
  msg_type: string;
}

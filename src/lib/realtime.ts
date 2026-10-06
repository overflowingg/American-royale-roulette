import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const getSocket = () => {
  if (!socket) {
    socket = io();
  }
  return socket;
};

export const emitBet = (bet: any) => {
  const s = getSocket();
  s.emit("place_bet", bet);
};

export const emitGameResult = (result: any) => {
  const s = getSocket();
  s.emit("game_result", result);
};

export const emitPlayerUpdate = (player: any) => {
  const s = getSocket();
  s.emit("player_update", player);
};

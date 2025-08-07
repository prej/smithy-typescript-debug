import { ClientRequest } from "http";

import { timing } from "./timing";

const DEFER_EVENT_LISTENER_TIME = 3000;

export interface SocketKeepAliveOptions {
  keepAlive: boolean;
  keepAliveMsecs?: number;
}

export const setSocketKeepAlive = (
  request: ClientRequest,
  { keepAlive, keepAliveMsecs }: SocketKeepAliveOptions,
  deferTimeMs = DEFER_EVENT_LISTENER_TIME
): NodeJS.Timeout | number => {
  if (keepAlive !== true) {
    console.log('Smithy Debug Log: setSocketKeepAlive - Keep-alive is disabled, skipping socket keep-alive registration');
    return -1;
  }

  const registerListener = () => {
    console.log(`Smithy Debug Log: setSocketKeepAlive - Setting socket keep-alive to ${keepAlive} with interval ${keepAliveMsecs || 0} ms`);
    if (request.socket) {
      console.log('Smithy Debug Log: setSocketKeepAlive - Request has an existing socket, setting keep-alive');
      request.socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
    } else {
      console.log('Smithy Debug Log: setSocketKeepAlive - Request does not have an existing socket, waiting for socket event');
      request.on("socket", (socket) => {
        socket.setKeepAlive(keepAlive, keepAliveMsecs || 0);
      });
    }
  };

  if (deferTimeMs === 0) {
    console.log('Smithy Debug Log: setSocketKeepAlive - No defer time, registering listener immediately');
    registerListener();
    return 0;
  }

  return timing.setTimeout(registerListener, deferTimeMs);
};

import { ClientRequest } from "http";

import { timing } from "./timing";

const DEFER_EVENT_LISTENER_TIME = 1000;

export const setConnectionTimeout = (
  request: ClientRequest,
  reject: (err: Error) => void,
  timeoutInMs = 0
): NodeJS.Timeout | number => {
  if (!timeoutInMs) {
    console.log('Smithy Debug Log: setConnectionTimeout - No timeout set, skipping connection timeout registration');
    return -1;
  }

  const registerTimeout = (offset: number) => {
    console.log(`Smithy Debug Log: setConnectionTimeout - Registering connection timeout with offset ${offset} ms`);
    // Throw a connecting timeout error unless a connection is made within time.
    const timeoutId = timing.setTimeout(() => {
      console.log(`Smithy Debug Log: Connection timeout reached after ${timeoutInMs} ms, destroying request`);
      request.destroy();
      reject(
        Object.assign(new Error(`Socket timed out without establishing a connection within ${timeoutInMs} ms`), {
          name: "TimeoutError",
        })
      );
    }, timeoutInMs - offset);

    const doWithSocket = (socket: typeof request.socket) => {
      if (socket?.connecting) {
        console.log('Smithy Debug Log: setConnectionTimeout - Socket is connecting, waiting for connect event');
        socket.on("connect", () => {
          timing.clearTimeout(timeoutId);
        });
      } else {
        console.log('Smithy Debug Log: setConnectionTimeout - Socket is already connected, clearing timeout');
        timing.clearTimeout(timeoutId);
      }
    };

    if (request.socket) {
      console.log('Smithy Debug Log: setConnectionTimeout - Request has an existing socket, checking connection state');
      doWithSocket(request.socket);
    } else {
      console.log('Smithy Debug Log: setConnectionTimeout - Request does not have an existing socket, waiting for socket event');
      request.on("socket", doWithSocket);
    }
  };

  if (timeoutInMs < 2000) {
    console.log(`Smithy Debug Log: setConnectionTimeout - ${timeoutInMs} ms is less than 2000 ms, deferring event listener registration`);
    registerTimeout(0);
    return 0;
  }

  return timing.setTimeout(registerTimeout.bind(null, DEFER_EVENT_LISTENER_TIME), DEFER_EVENT_LISTENER_TIME);
};

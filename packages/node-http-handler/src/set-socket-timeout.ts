import { ClientRequest } from "http";

import { DEFAULT_REQUEST_TIMEOUT } from "./node-http-handler";
import { timing } from "./timing";

const DEFER_EVENT_LISTENER_TIME = 3000;

export const setSocketTimeout = (
  request: ClientRequest,
  reject: (err: Error) => void,
  timeoutInMs = DEFAULT_REQUEST_TIMEOUT
): NodeJS.Timeout | number => {
  console.log(`Smithy Debug Log: setSocketTimeout - Setting socket timeout to ${timeoutInMs} ms`);
  const registerTimeout = (offset: number) => {
    console.log(`Smithy Debug Log: setSocketTimeout - Registering timeout with offset ${offset} ms`);
    const timeout = timeoutInMs - offset;
    const onTimeout = () => {
      console.log(`Smithy Debug Log: setSocketTimeout - Timeout reached after ${timeout} ms, destroying request`);
      request.destroy();
      reject(Object.assign(new Error(`Connection timed out after ${timeoutInMs} ms`), { name: "TimeoutError" }));
    };

    if (request.socket) {
      console.log('Smithy Debug Log: setSocketTimeout - Request has an existing socket, setting timeout directly');
      request.socket.setTimeout(timeout, onTimeout);
      request.on("close", () => request.socket?.removeListener("timeout", onTimeout));
    } else {
      console.log('Smithy Debug Log: setSocketTimeout - Request does not have an existing socket, setting timeout on request');
      request.setTimeout(timeout, onTimeout);
    }
  };

  if (0 < timeoutInMs && timeoutInMs < 6000) {
    console.log(`Smithy Debug Log: setSocketTimeout- ${timeoutInMs} ms is less than 6000 ms, deferring event listener registration`);
    registerTimeout(0);
    return 0;
  }

  return timing.setTimeout(
    registerTimeout.bind(null, timeoutInMs === 0 ? 0 : DEFER_EVENT_LISTENER_TIME),
    DEFER_EVENT_LISTENER_TIME
  );
};

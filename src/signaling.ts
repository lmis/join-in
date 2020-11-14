/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { useRef, useEffect, useState, MutableRefObject } from "react";
import { Socket } from "socket.io-client";
import adapter from "webrtc-adapter";
import io from "socket.io-client";

export interface SignalingServer {
  userIds: string[];
  maxUsersReached: boolean;
}

enum Signals {
  HELLO_CLIENT = "hello-client",
  MAX_USERS_REACHED = "max-users-reached",
  ADD_USERS = "add-users",
  REMOVE_USER = "remove-user"
}

export const useSignalingServer = (url: string): SignalingServer => {
  const [userIds, setUserIds] = useState<string[]>([]);
  const [maxUsersReached, setMaxUsersReached] = useState(false);
  useEffect(() => {
    const socket = io(url, { transports: ["websocket"] }).connect();
    socket
      .on(Signals.HELLO_CLIENT, (data: { id: string }) =>
        console.log(`Server says hi ${data.id}`)
      )
      .on(Signals.MAX_USERS_REACHED, () => {
        setMaxUsersReached(true);
      })
      .on(Signals.ADD_USERS, (data: { userIds: string[] }) => {
        setUserIds((prev) => [...prev, ...data.userIds]);
      })
      .on(Signals.REMOVE_USER, (data: { userId: string }) => {
        setUserIds((prev) => prev.filter((id) => id !== data.userId));
      });
    return () => {
      console.log("disconnecting");
      socket.off(Signals.HELLO_CLIENT);
      socket.off(Signals.MAX_USERS_REACHED);
      socket.off(Signals.ADD_USERS);
      socket.off(Signals.REMOVE_USER);
      socket.disconnect();
    };
  }, [url]);

  return { userIds, maxUsersReached };
};

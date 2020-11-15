/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import adapter from "webrtc-adapter";
import io from "socket.io-client";

export interface UserData {
  userId: string;
  peerConnection: RTCPeerConnection;
  streams?: readonly MediaStream[];
  error?: Error;
}

export interface RemoteData {
  yourId: string | null;
  usersById: Map<string, UserData>;
  maxUsersReached: boolean;
}

enum Signals {
  HELLO_CLIENT = "hello-client",
  MAX_USERS_REACHED = "max-users-reached",
  USER_JOINED = "user-joined",
  USER_LEFT = "user-left",
  ICE_CANDIDATE = "ice-candidate",
  CONNECTION_OFFER = "connection-offer",
  CONNECTION_ANSWER = "connection-answer"
}

const config = {
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302"
    }
  ]
};

const put = <K, V, V2 extends V>(key: K, value: V2) => (
  orig: Map<K, V>
): Map<K, V> => {
  const m = new Map(orig);
  m.set(key, value);
  return m;
};

const logEvent = (signal: Signals, payload?: any) => {
  console.log(
    `INCOMING ${signal} ${
      payload ? `(${JSON.stringify(payload)})`.substring(0, 70) : ""
    }`
  );
};

const logEmit = (signal: Signals, payload?: any) => {
  console.log(
    `OUTGOING ${signal} ${
      payload ? `(${JSON.stringify(payload)})`.substring(0, 70) : ""
    }`
  );
};

export const useRemoteConnection = (
  url: string,
  mediaStream: MediaStream | null
): RemoteData => {
  const [usersById, setUsersByIdU] = useState<Map<string, UserData>>(new Map());
  const [yourId, setYourId] = useState<string | null>(null);
  const [maxUsersReached, setMaxUsersReached] = useState(false);

  useEffect(() => {
    if (!mediaStream) {
      return;
    }
    let r = { usersByIdVolatile: new Map(usersById) };
    const setUsersById = (
      f:
        | Map<string, UserData>
        | ((x: Map<string, UserData>) => Map<string, UserData>)
    ) => {
      if (f instanceof Function) {
        r.usersByIdVolatile = f(r.usersByIdVolatile);
      } else {
        r.usersByIdVolatile = f;
      }
      console.log(
        "setting",
        JSON.stringify([...r.usersByIdVolatile.values()].map((u) => u.streams))
      );
      setUsersByIdU(r.usersByIdVolatile);
    };
    const getUser = (userId: string): UserData | null =>
      r.usersByIdVolatile.get(userId) ?? null;

    console.log("connecting");
    const socket = io(url, { transports: ["websocket"] }).connect();
    const emit = (signal: Signals, payload: any) => {
      logEmit(signal, payload);
      socket.emit(signal, payload);
    };
    const mkRTCConnection = (userId: string) => {
      const peerConnection = new RTCPeerConnection(config);

      peerConnection.onicecandidate = ({ candidate }) => {
        if (candidate) {
          socket.emit(Signals.ICE_CANDIDATE, { target: userId, candidate });
        }
      };
      peerConnection.onnegotiationneeded = async () => {
        try {
          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);
          emit(Signals.CONNECTION_OFFER, { target: userId, offer });
          setUsersById(
            put(userId, {
              userId,
              peerConnection
            })
          );
        } catch (error) {
          setUsersById(
            put(userId, {
              userId,
              peerConnection,
              error
            })
          );
        }
      };
      peerConnection.ontrack = (event) => {
        console.log("happening");
        console.log(event.streams);
        setUsersById(
          put(userId, { userId, peerConnection, streams: event.streams })
        );
      };

      return peerConnection;
    };
    socket
      .on(
        Signals.HELLO_CLIENT,
        (payload: { id: string; userIds: string[] }) => {
          logEvent(Signals.HELLO_CLIENT, payload);
          setYourId(payload.id);
          const m = new Map<string, UserData>();
          payload.userIds.forEach((userId) =>
            m.set(
              userId,
              getUser(userId) ?? {
                userId,
                peerConnection: mkRTCConnection(userId)
              }
            )
          );
          setUsersById(m);
        }
      )
      .on(Signals.MAX_USERS_REACHED, () => {
        logEvent(Signals.MAX_USERS_REACHED);
        setMaxUsersReached(true);
      })
      .on(Signals.USER_JOINED, (payload: { userId: string }) => {
        logEvent(Signals.USER_JOINED, payload);
        const { userId } = payload;
        const peerConnection = mkRTCConnection(userId);
        mediaStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, mediaStream);
        });
      })
      .on(
        Signals.ICE_CANDIDATE,
        (payload: { userId: string; candidate: RTCIceCandidate }) => {
          // logEvent(Signals.ICE_CANDIDATE, payload);
          const { userId, candidate } = payload;

          const peerConnection = getUser(userId)?.peerConnection;
          if (peerConnection?.remoteDescription?.type) {
            peerConnection.addIceCandidate(candidate);
          }
        }
      )
      .on(
        Signals.CONNECTION_OFFER,
        async (payload: { userId: string; offer: RTCSessionDescription }) => {
          logEvent(Signals.CONNECTION_OFFER, payload);
          const { userId, offer } = payload;
          const user = getUser(userId) ?? {
            userId,
            peerConnection: mkRTCConnection(userId)
          };
          const { peerConnection } = user;

          try {
            await peerConnection.setRemoteDescription(offer);
            mediaStream.getTracks().forEach((track) => {
              peerConnection.addTrack(track, mediaStream);
            });
            const answer = await peerConnection.createAnswer();
            peerConnection.setLocalDescription(answer);
            emit(Signals.CONNECTION_ANSWER, { target: userId, answer });
            setUsersById(
              put(userId, getUser(userId) ?? { userId, peerConnection })
            );
          } catch (error) {
            setUsersById(
              put(userId, {
                userId,
                peerConnection,
                error
              })
            );
          }
        }
      )
      .on(
        Signals.CONNECTION_ANSWER,
        (payload: { userId: string; answer: RTCSessionDescription }) => {
          logEvent(Signals.CONNECTION_ANSWER, payload);
          const peerConnection = getUser(payload.userId)?.peerConnection;
          if (peerConnection) {
            peerConnection.setRemoteDescription(payload.answer);
          }
        }
      )
      .on(Signals.USER_LEFT, (payload: { userId: string }) => {
        logEvent(Signals.USER_LEFT, payload);
        const { userId } = payload;
        const user = getUser(userId);
        user?.peerConnection.close();
        setUsersById((xs) => {
          const m = new Map(xs);
          m.delete(userId);
          return m;
        });
      });
    return () => {
      console.log("disconnecting");
      Object.keys(Signals)
        .map((k) => (Signals as any)[k])
        .forEach((s) => socket.off(s));
      socket.disconnect();
    };
  }, [url, mediaStream]);

  return { yourId, usersById, maxUsersReached };
};

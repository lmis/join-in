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

export const useRemoteConnection = (
  url: string,
  mediaStream: MediaStream | null
): RemoteData => {
  const [usersById, setUsersById] = useState<Map<string, UserData>>(new Map());
  const [maxUsersReached, setMaxUsersReached] = useState(false);

  const getUser = (userId: string): UserData | null =>
    usersById.get(userId) ?? null;

  useEffect(() => {
    console.log("connecting");
    const socket = io(url, { transports: ["websocket"] }).connect();
    socket
      .on(
        Signals.HELLO_CLIENT,
        ({ id, userIds }: { id: string; userIds: string[] }) => {
          console.log(`Server says hi ${id}`);
          console.log(`Other users: ${userIds}`);
          const m = new Map<string, UserData>();
          userIds.forEach((userId) =>
            m.set(userId, {
              userId,
              peerConnection: new RTCPeerConnection(config)
            })
          );
          setUsersById(m);
        }
      )
      .on(Signals.MAX_USERS_REACHED, () => {
        setMaxUsersReached(true);
      })
      .on(Signals.USER_JOINED, ({ userId }: { userId: string }) => {
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
            socket.emit(Signals.CONNECTION_OFFER, { target: userId, offer });
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

        peerConnection.ontrack = (event) =>
          setUsersById(
            put(userId, { userId, peerConnection, streams: event.streams })
          );

        mediaStream?.getTracks()?.forEach((track) => {
          peerConnection.addTrack(track, mediaStream);
        });
      })
      .on(
        Signals.ICE_CANDIDATE,
        ({
          userId,
          candidate
        }: {
          userId: string;
          candidate: RTCIceCandidate;
        }) => {
          const user = getUser(userId) ?? {
            userId,
            peerConnection: new RTCPeerConnection(config)
          };

          user.peerConnection.addIceCandidate(candidate);
          setUsersById(put(userId, user));
        }
      )
      .on(
        Signals.CONNECTION_OFFER,
        async ({
          userId,
          offer
        }: {
          userId: string;
          offer: RTCSessionDescription;
        }) => {
          const user = getUser(userId) ?? {
            userId,
            peerConnection: new RTCPeerConnection(config)
          };
          const { peerConnection } = user;

          try {
            await peerConnection.setRemoteDescription(offer);
            mediaStream?.getTracks()?.forEach((track) => {
              peerConnection.addTrack(track, mediaStream);
            });
            const answer = await peerConnection.createAnswer();
            peerConnection.setLocalDescription(answer);
            socket.emit(Signals.CONNECTION_ANSWER, { target: userId, answer });
            setUsersById(put(userId, { userId, peerConnection }));
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
        ({
          userId,
          answer
        }: {
          userId: string;
          answer: RTCSessionDescription;
        }) => {
          const user = getUser(userId)!;
          user.peerConnection.setLocalDescription(answer);
        }
      )
      .on(Signals.USER_LEFT, ({ userId }: { userId: string }) => {
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

  return { usersById, maxUsersReached };
};

/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { useEffect, useState, useRef } from "react";
import adapter from "webrtc-adapter";
import io from "socket.io-client";
import { Position, positionFuzzyEqual } from "utils";

enum Signal {
  HELLO_CLIENT = "hello-client",
  MAX_USERS_REACHED = "max-users-reached",
  USER_JOINED = "user-joined",
  USER_LEFT = "user-left",
  POSITION_UPDATE = "position-update",
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

interface ConnectionParams {
  url: string;
  mediaStream: MediaStream;
  positionUpdateInterval: number;
  getPosition: () => Position;
  onConnectionEstablished: (id: string, userIds: string[]) => void;
  onMaxUsersReached: () => void;
  onUserJoined: (userId: string) => void;
  onUserLeft: (userId: string) => void;
  onError: (userId: string, error: Error) => void;
  onStreams: (userId: string, streams: readonly MediaStream[]) => void;
  onPositionUpdate: (userId: string, position: Position) => void;
}

const stringifyPayload = <T>(payload?: T): string =>
  payload ? `(${JSON.stringify(payload)})`.substring(0, 70) : "";

const establishConnection = ({
  url,
  mediaStream,
  positionUpdateInterval,
  getPosition,
  onConnectionEstablished,
  onMaxUsersReached,
  onUserJoined,
  onUserLeft,
  onError,
  onStreams,
  onPositionUpdate
}: ConnectionParams): (() => void) => {
  const connectionsByUserId = new Map<string, RTCPeerConnection>();
  const registeredSignals = new Set<Signal>();
  const intervalIds: number[] = [];

  console.log("connecting to ", url);
  const socket = io(url, { transports: ["websocket"] }).connect();
  const send = <T>(signal: Signal, payload: T, silent?: boolean) => {
    if (!socket.connected) {
      if (!silent) {
        console.log(
          `NOT CONNECTED. CANNOT SEND ${signal} ${stringifyPayload(payload)}`
        );
      }
    } else {
      if (!silent) {
        console.log(`SEND ${signal} ${stringifyPayload(payload)}`);
      }
      socket.emit(signal, payload);
    }
  };
  const receive = <T extends object | void>(
    signal: Signal,
    handle: (payload: T) => void,
    silent?: boolean
  ) => {
    socket.on(signal, (payload: T) => {
      if (!silent) {
        console.log(`RECEIVE ${signal} ${stringifyPayload(payload)}`);
      }
      handle(payload);
    });
    registeredSignals.add(signal);
  };

  const cleanUp = () => {
    console.log("disconnecting");
    intervalIds.forEach(clearInterval);
    registeredSignals.forEach((s) => socket.off(s));
    socket.disconnect();
  };

  const getOrMakeRTCPeerConnection = (userId: string): RTCPeerConnection => {
    const existingPC = connectionsByUserId.get(userId);
    if (existingPC) {
      return existingPC;
    }
    const peerConnection = new RTCPeerConnection(config);
    connectionsByUserId.set(userId, peerConnection);

    peerConnection.onicecandidate = ({ candidate }) => {
      if (candidate) {
        send(Signal.ICE_CANDIDATE, { target: userId, candidate }, true);
      }
    };
    peerConnection.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        send(Signal.CONNECTION_OFFER, { target: userId, offer });
      } catch (error) {
        onError(userId, error);
      }
    };
    peerConnection.ontrack = ({ streams }) => {
      onStreams(userId, streams);
    };

    return peerConnection;
  };

  receive<{ userIds: string[] }>(Signal.HELLO_CLIENT, ({ userIds }) => {
    userIds.forEach(getOrMakeRTCPeerConnection);
    onConnectionEstablished(socket.id, userIds);
    intervalIds.push(
      setInterval(() => {
        const [x, y] = getPosition();
        send(Signal.POSITION_UPDATE, {
          position: [Math.round(x), Math.round(y)]
        });
      }, positionUpdateInterval)
    );
  });

  receive<void>(Signal.MAX_USERS_REACHED, () => {
    onMaxUsersReached();
  });

  receive<{ userId: string }>(Signal.USER_JOINED, ({ userId }) => {
    const peerConnection = getOrMakeRTCPeerConnection(userId);
    mediaStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, mediaStream);
    });
    onUserJoined(userId);
  });

  receive<{ userId: string; position: Position }>(
    Signal.POSITION_UPDATE,
    ({ userId, position }) => {
      onPositionUpdate(userId, position);
    }
  );

  receive<{ userId: string; candidate: RTCIceCandidate }>(
    Signal.ICE_CANDIDATE,
    ({ userId, candidate }) => {
      const peerConnection = getOrMakeRTCPeerConnection(userId);
      if (peerConnection.remoteDescription?.type) {
        peerConnection.addIceCandidate(candidate);
      }
    },
    true
  );

  receive<{ userId: string; offer: RTCSessionDescription }>(
    Signal.CONNECTION_OFFER,
    async ({ userId, offer }) => {
      const peerConnection = getOrMakeRTCPeerConnection(userId);
      try {
        await peerConnection.setRemoteDescription(offer);
        mediaStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, mediaStream);
        });
        const answer = await peerConnection.createAnswer();
        peerConnection.setLocalDescription(answer);
        send(Signal.CONNECTION_ANSWER, { target: userId, answer });
      } catch (error) {
        onError(userId, error);
      }
    }
  );
  receive<{ userId: string; answer: RTCSessionDescription }>(
    Signal.CONNECTION_ANSWER,
    ({ userId, answer }) => {
      getOrMakeRTCPeerConnection(userId).setRemoteDescription(answer);
    }
  );

  receive<{ userId: string }>(Signal.USER_LEFT, ({ userId }) => {
    const peerConnection = connectionsByUserId.get(userId);
    if (peerConnection) {
      peerConnection.close();
      connectionsByUserId.delete(userId);
    }
    onUserLeft(userId);
  });

  return cleanUp;
};

export interface UserData {
  userId: string;
  position?: Position;
  streams?: readonly MediaStream[];
  error?: Error;
}

export interface RemoteConnection {
  connectionId: string | null;
  users: UserData[];
  maxUsersReached: boolean;
}

export const useRemoteConnection = (
  url: string,
  getPosition: () => Position,
  mediaStream: MediaStream | null
): RemoteConnection => {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [maxUsersReached, setMaxUsersReached] = useState<boolean>(false);
  const [users, setUsers] = useState<UserData[]>([]);

  useEffect(() => {
    if (!mediaStream) {
      return;
    }
    const updateUser = (userId: string, update: Partial<UserData>) =>
      setUsers((xs) => [
        ...xs.map((u) => (u.userId !== userId ? u : { ...u, ...update }))
      ]);
    return establishConnection({
      url,
      mediaStream,
      positionUpdateInterval: 200,
      getPosition,
      onConnectionEstablished: (id, userIds) => {
        setConnectionId(id);
        setUsers(userIds.map((userId) => ({ userId })));
      },
      onMaxUsersReached: () => setMaxUsersReached(true),
      onUserJoined: (userId) => setUsers((xs) => [...xs, { userId }]),
      onUserLeft: (userId) =>
        setUsers((xs) => xs.filter((u) => u.userId !== userId)),
      onError: (userId, error) => updateUser(userId, { error }),
      onStreams: (userId, streams) => updateUser(userId, { streams }),
      onPositionUpdate: (userId, position) => updateUser(userId, { position })
    });
  }, [url, mediaStream, getPosition]);

  return { connectionId, users, maxUsersReached };
};

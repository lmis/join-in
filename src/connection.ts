/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import adapter from "webrtc-adapter";
import io from "socket.io-client";
import { Position } from "utils";

enum Signals {
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
  onConnectionEstablished: (id: string, userIds: string[]) => void;
  onMaxUsersReached: () => void;
  onUserJoined: (userId: string) => void;
  onUserLeft: (userId: string) => void;
  onError: (userId: string, error: Error) => void;
  onStreams: (userId: string, streams: readonly MediaStream[]) => void;
  onPositionUpdate: (userId: string, position: Position) => void;
}

interface ConnectionReturn {
  sendPositionUpdate: (position: Position) => void;
  cleanUp: () => void;
}

const stringifyPayload = (payload?: object): string =>
  payload ? `(${JSON.stringify(payload)})`.substring(0, 70) : "";

const establishConnection = ({
  url,
  mediaStream,
  onConnectionEstablished,
  onMaxUsersReached,
  onUserJoined,
  onUserLeft,
  onError,
  onStreams,
  onPositionUpdate
}: ConnectionParams): ConnectionReturn => {
  const connectionsByUserId = new Map<string, RTCPeerConnection>();
  const registeredSignals = new Set<Signals>();

  console.log("connecting");
  const socket = io(url, { transports: ["websocket"] }).connect();
  const send = <T extends object>(
    signal: Signals,
    payload: T,
    silent?: boolean
  ) => {
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
  const receive = <T extends object>(
    signal: Signals,
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

  const sendPositionUpdate = (position: Position): void => {
    send(Signals.POSITION_UPDATE, { position });
  };

  const cleanUp = () => {
    console.log("disconnecting");
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
        send(Signals.ICE_CANDIDATE, { target: userId, candidate }, true);
      }
    };
    peerConnection.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        send(Signals.CONNECTION_OFFER, { target: userId, offer });
      } catch (error) {
        onError(userId, error);
      }
    };
    peerConnection.ontrack = ({ streams }) => {
      onStreams(userId, streams);
    };

    return peerConnection;
  };

  receive<{ userIds: string[] }>(Signals.HELLO_CLIENT, ({ userIds }) => {
    userIds.forEach(getOrMakeRTCPeerConnection);
    onConnectionEstablished(socket.id, userIds);
  });

  receive<void>(Signals.MAX_USERS_REACHED, () => {
    onMaxUsersReached();
  });

  receive<{ userId: string }>(Signals.USER_JOINED, ({ userId }) => {
    const peerConnection = getOrMakeRTCPeerConnection(userId);
    mediaStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, mediaStream);
    });
    onUserJoined(userId);
  });

  receive<{ userId: string; position: Position }>(
    Signals.POSITION_UPDATE,
    ({ userId, position }) => {
      onPositionUpdate(userId, position);
    }
  );

  receive<{ userId: string; candidate: RTCIceCandidate }>(
    Signals.ICE_CANDIDATE,
    ({ userId, candidate }) => {
      const peerConnection = getOrMakeRTCPeerConnection(userId);
      if (peerConnection.remoteDescription?.type) {
        peerConnection.addIceCandidate(candidate);
      }
    },
    true
  );

  receive<{ userId: string; offer: RTCSessionDescription }>(
    Signals.CONNECTION_OFFER,
    async ({ userId, offer }) => {
      const peerConnection = getOrMakeRTCPeerConnection(userId);
      try {
        await peerConnection.setRemoteDescription(offer);
        mediaStream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, mediaStream);
        });
        const answer = await peerConnection.createAnswer();
        peerConnection.setLocalDescription(answer);
        send(Signals.CONNECTION_ANSWER, { target: userId, answer });
      } catch (error) {
        onError(userId, error);
      }
    }
  );
  receive<{ userId: string; answer: RTCSessionDescription }>(
    Signals.CONNECTION_ANSWER,
    ({ userId, answer }) => {
      getOrMakeRTCPeerConnection(userId).setRemoteDescription(answer);
    }
  );

  receive<{ userId: string }>(Signals.USER_LEFT, ({ userId }) => {
    const peerConnection = connectionsByUserId.get(userId);
    if (peerConnection) {
      peerConnection.close();
      connectionsByUserId.delete(userId);
    }
    onUserLeft(userId);
  });

  return {
    sendPositionUpdate,
    cleanUp
  };
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
  position: Position,
  mediaStream: MediaStream | null
): RemoteConnection => {
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [maxUsersReached, setMaxUsersReached] = useState<boolean>(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [sendPositionUpdate, setSendPositionUpdate] = useState<
    ((position: Position) => void) | null
  >(null);

  useEffect(() => {
    sendPositionUpdate?.(position);
  }, [sendPositionUpdate, position]);

  useEffect(() => {
    if (!mediaStream) {
      return;
    }

    const updateUser = (userId: string, update: Partial<UserData>) =>
      setUsers((xs) => [
        ...xs.map((u) => (u.userId !== userId ? u : { ...u, ...update }))
      ]);
    const connection = establishConnection({
      url,
      mediaStream,
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
    setSendPositionUpdate(() => connection.sendPositionUpdate);

    return connection.cleanUp;
  }, [url, mediaStream]);

  return { connectionId, users, maxUsersReached };
};

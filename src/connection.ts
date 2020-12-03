/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import adapter from "webrtc-adapter";
import io from "socket.io-client";
import { Position, roundTo } from "utils";
import { Movement } from "physics/movement";
import { has } from "userMedia/mediaStream";

enum Signal {
  HELLO_CLIENT = "hello-client",
  MAX_USERS_REACHED = "max-users-reached",
  USER_JOINED = "user-joined",
  USER_LEFT = "user-left",
  STATE_UPDATE = "state-update",
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

interface UserState {
  position: Position;
  angle: number;
  speed: number;
  videoEnabled: boolean;
  audioEnabled: boolean;
}

export interface UserData {
  userId: string;
  state?: UserState;
  streams?: readonly MediaStream[];
  error?: string;
}

interface ConnectionParams {
  url: string;
  onConnectionEstablished: (id: string | null) => void;
  onUserData: (data: UserData[]) => void;
  onMaxUsersReached: (reached: boolean) => void;
}

interface Connection {
  sendStateUpdate: (s: UserState) => void;
  setMediaStream: (m: MediaStream | null) => void;
}

const addMediaStream = (
  peerConnection: RTCPeerConnection,
  mediaStream: MediaStream | null
) => {
  if (!mediaStream) {
    return;
  }
  try {
    mediaStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, mediaStream);
    });
  } catch (e) {}
};

const stringifyPayload = <T>(payload?: T): string =>
  payload ? `(${JSON.stringify(payload)})`.substring(0, 120) : "";

const establishConnection = ({
  url,
  onConnectionEstablished,
  onUserData,
  onMaxUsersReached
}: ConnectionParams): Connection & { cleanup: () => void } => {
  const connectionsByUserId = new Map<string, RTCPeerConnection>();
  const registeredSignals = new Set<Signal>();
  let mediaStream: MediaStream | null;
  let userData: Map<string, UserData> = new Map();
  const addUser = (userId: string) => {
    userData.set(userId, { userId });
    onUserData([...userData.values()]);
  };
  const removeUser = (userId: string) => {
    userData.delete(userId);
    onUserData([...userData.values()]);
  };
  const updateUser = (userId: string, update: Partial<UserData>) => {
    userData.set(userId, { ...userData.get(userId), ...update, userId });
    onUserData([...userData.values()]);
  };

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

  const cleanup = () => {
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
        send(Signal.ICE_CANDIDATE, { target: userId, candidate }, true);
      }
    };
    peerConnection.onnegotiationneeded = async () => {
      try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        send(Signal.CONNECTION_OFFER, { target: userId, offer });
      } catch (error) {
        updateUser(userId, { error: error.message });
      }
    };
    peerConnection.ontrack = ({ streams }) => {
      updateUser(userId, { streams });
    };

    return peerConnection;
  };

  receive<{ userIds: string[] }>(Signal.HELLO_CLIENT, ({ userIds }) => {
    userIds.forEach(getOrMakeRTCPeerConnection);
    onConnectionEstablished(socket.id);
    userIds.forEach(addUser);
  });

  receive<void>(Signal.MAX_USERS_REACHED, () => {
    onMaxUsersReached(true);
  });

  receive<{ userId: string }>(Signal.USER_JOINED, ({ userId }) => {
    const peerConnection = getOrMakeRTCPeerConnection(userId);
    addMediaStream(peerConnection, mediaStream);
    addUser(userId);
  });

  receive<
    {
      userId: string;
    } & UserState
  >(Signal.STATE_UPDATE, ({ userId, ...state }) => {
    updateUser(userId, { state });
  });

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
        addMediaStream(peerConnection, mediaStream);
        const answer = await peerConnection.createAnswer();
        peerConnection.setLocalDescription(answer);
        send(Signal.CONNECTION_ANSWER, { target: userId, answer });
      } catch (error) {
        updateUser(userId, { error });
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
    removeUser(userId);
    onMaxUsersReached(false);
  });

  return {
    sendStateUpdate: (update) => {
      send(Signal.STATE_UPDATE, update);
    },
    setMediaStream: (m: MediaStream | null) => {
      mediaStream = m;
      if (m) {
        [...connectionsByUserId.values()].forEach((peerConnection) => {
          addMediaStream(peerConnection, m);
        });
      }
    },
    cleanup
  };
};

export interface RemoteConnection {
  connectionId: string | null;
  users: UserData[];
  maxUsersReached: boolean;
}

export const useRemoteConnection = (
  url: string,
  stateUpdateInterval: number,
  movement: Movement | null,
  mediaStream: MediaStream | null
): RemoteConnection => {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [maxUsersReached, setMaxUsersReached] = useState<boolean>(false);

  useEffect(() => {
    if (!movement) {
      return;
    }
    const { cleanup, ...connection } = establishConnection({
      url,
      onConnectionEstablished: setConnectionId,
      onUserData: setUsers,
      onMaxUsersReached: setMaxUsersReached
    });
    setConnection(connection);
    return () => {
      setConnection(null);
      cleanup();
    };
  }, [url, movement]);

  useEffect(() => {
    connection?.setMediaStream(mediaStream);
  }, [mediaStream, connection]);

  useEffect(() => {
    if (!movement || !connection || !connectionId) {
      return;
    }
    let prev: null | UserState = null;
    const sendUpdate = () => {
      const [x, y] = movement.getPosition();
      const position: Position = [Math.round(x), Math.round(y)];
      const angle = +roundTo(movement.getAngle(), 0.1).toFixed(2);
      const speed = +roundTo(movement.getSpeed(), 0.1).toFixed(2);
      const audioEnabled = has("audio", mediaStream);
      const videoEnabled = has("video", mediaStream);
      if (
        prev === null ||
        prev.angle !== angle ||
        prev.speed !== speed ||
        position[0] !== prev.position[0] ||
        position[1] !== prev.position[1] ||
        videoEnabled !== prev.videoEnabled ||
        audioEnabled !== prev.audioEnabled
      ) {
        const update = {
          position,
          angle,
          speed,
          videoEnabled,
          audioEnabled
        };
        connection.sendStateUpdate(update);
        prev = update;
      }
    };
    sendUpdate();
    const id = setInterval(sendUpdate, stateUpdateInterval);
    return () => clearInterval(id);
  }, [
    users.length,
    mediaStream,
    movement,
    connection,
    connectionId,
    stateUpdateInterval
  ]);

  return { connectionId, users, maxUsersReached };
};

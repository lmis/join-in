/* eslint-disable no-undef, @typescript-eslint/no-unused-vars */
import { useCallback, useEffect } from "react";

export const useEventListener = <K extends keyof DocumentEventMap>(
  type: K,
  onEvent: (e: DocumentEventMap[K]) => void
) => {
  useEffect(() => {
    document.addEventListener(type, onEvent);
    return () => {
      document.removeEventListener(type, onEvent);
    };
  }, [type, onEvent]);
};

export type KeyUpDownEvent =
  | DocumentEventMap["keydown"]
  | DocumentEventMap["keyup"];

export const useKeyUpDown = (
  action: (e: KeyUpDownEvent, isDown: boolean) => void
) => {
  const onDown = useCallback(
    (e: DocumentEventMap["keydown"]) => action(e, true),
    [action]
  );
  const onUp = useCallback((e: DocumentEventMap["keyup"]) => action(e, false), [
    action
  ]);
  useEventListener("keydown", onDown);
  useEventListener("keyup", onUp);
};

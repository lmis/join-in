import React, { FC } from "react";
import Button from "antd/lib/button/button";
import {
  AudioMutedOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  CloseSquareOutlined,
  ArrowsAltOutlined,
  ShrinkOutlined
} from "@ant-design/icons";
import { setEnabled } from "userMedia/mediaStream";

interface Props {
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  incrementZoom: () => void;
  decrementZoom: () => void;
}

export const ButtonArea: FC<Props> = ({
  stream,
  audioEnabled,
  videoEnabled,
  incrementZoom,
  decrementZoom
}) => {
  return (
    <div className="Buttons">
      {videoEnabled ? (
        <Button
          type="primary"
          className="Button"
          shape="round"
          icon={<CloseSquareOutlined />}
          size="large"
          disabled={!stream}
          onClick={() => stream && setEnabled("video", false, stream)}
        />
      ) : (
        <Button
          type="primary"
          className="Button"
          shape="round"
          icon={<VideoCameraOutlined />}
          size="large"
          disabled={!stream}
          onClick={() => stream && setEnabled("video", true, stream)}
        />
      )}
      {audioEnabled ? (
        <Button
          type="primary"
          className="Button"
          shape="round"
          icon={<AudioMutedOutlined />}
          size="large"
          disabled={!stream}
          onClick={() => stream && setEnabled("audio", false, stream)}
        />
      ) : (
        <Button
          type="primary"
          className="Button"
          shape="round"
          icon={<AudioOutlined />}
          size="large"
          disabled={!stream}
          onClick={() => stream && setEnabled("audio", true, stream)}
        />
      )}
      <Button
        type="primary"
        className="Button"
        shape="round"
        icon={<ArrowsAltOutlined />}
        size="large"
        onClick={incrementZoom}
      />
      <Button
        type="primary"
        className="Button"
        shape="round"
        icon={<ShrinkOutlined />}
        size="large"
        onClick={decrementZoom}
      />
    </div>
  );
};

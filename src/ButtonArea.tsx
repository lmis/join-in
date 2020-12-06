import React, { FC } from "react";
import Button from "antd/lib/button/button";
import {
  AudioMutedOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  CloseSquareOutlined
} from "@ant-design/icons";
import { setEnabled } from "userMedia/mediaStream";

interface Props {
  stream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
}

export const ButtonArea: FC<Props> = ({
  stream,
  audioEnabled,
  videoEnabled
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
    </div>
  );
};

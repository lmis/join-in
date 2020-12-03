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
  stream: MediaStream;
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
          onClick={() => setEnabled("video", false, stream)}
        />
      ) : (
        <Button
          type="primary"
          className="Button"
          shape="round"
          icon={<VideoCameraOutlined />}
          size="large"
          onClick={() => setEnabled("video", true, stream)}
        />
      )}
      {audioEnabled ? (
        <Button
          type="primary"
          className="Button"
          shape="round"
          icon={<AudioMutedOutlined />}
          size="large"
          onClick={() => setEnabled("audio", false, stream)}
        />
      ) : (
        <Button
          type="primary"
          className="Button"
          shape="round"
          icon={<AudioOutlined />}
          size="large"
          onClick={() => setEnabled("audio", true, stream)}
        />
      )}
    </div>
  );
};

import { useVideoPlayer, VideoView } from 'expo-video';
import { type ViewStyle } from 'react-native';

type Props = {
  uri: string;
  style?: ViewStyle;
};

/** A looping video surface with native transport controls and fullscreen —
 * used on the media detail screen when the item is a video. */
export function GalleryVideo({ uri, style }: Props) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  return (
    <VideoView
      player={player}
      style={style}
      contentFit="contain"
      nativeControls
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

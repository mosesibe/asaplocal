import { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Full-screen image viewer. Controlled by `index` (null = closed) so a single
 * viewer can page through a whole set — a job's photos, or every concept in a
 * Redesign Studio session. Swipe to page, tap anywhere or the ✕ to close.
 */
export function ImageLightbox({ images, index, onClose }: { images: string[]; index: number | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const visible = index !== null && index >= 0 && index < images.length;
  const [current, setCurrent] = useState(index ?? 0);

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {visible && (
          <FlatList
            data={images}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <Pressable onPress={onClose} style={[styles.page, { width, height }]} accessibilityLabel="Close image">
                <Image source={{ uri: item }} style={{ width, height: height * 0.8 }} resizeMode="contain" />
              </Pressable>
            )}
          />
        )}

        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
          style={[styles.close, { top: insets.top + 12 }]}
        >
          <X size={22} color="#fff" />
        </Pressable>

        {images.length > 1 && (
          <Text style={[styles.counter, { bottom: insets.bottom + 24 }]}>
            {current + 1} / {images.length}
          </Text>
        )}
      </View>
    </Modal>
  );
}

/** A row of thumbnails; tapping one opens the whole set in the lightbox at that image. */
export function ImageGallery({
  images,
  thumbSize = 72,
  thumbStyle,
  style,
}: {
  images: string[];
  thumbSize?: number;
  thumbStyle?: StyleProp<ImageStyle>;
  style?: StyleProp<ViewStyle>;
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);
  if (images.length === 0) return null;

  return (
    <>
      <View style={[styles.row, style]}>
        {images.map((uri, i) => (
          <Pressable
            key={`${uri}-${i}`}
            onPress={() => setOpenAt(i)}
            accessibilityRole="imagebutton"
            accessibilityLabel={`View photo ${i + 1} of ${images.length}`}
          >
            <Image source={{ uri }} style={[{ width: thumbSize, height: thumbSize, borderRadius: 8 }, thumbStyle]} />
          </Pressable>
        ))}
      </View>
      <ImageLightbox images={images} index={openAt} onClose={() => setOpenAt(null)} />
    </>
  );
}

/** A single image that opens full-screen when tapped. */
export function ZoomableImage({ uri, style, accessibilityLabel }: { uri: string; style?: StyleProp<ImageStyle>; accessibilityLabel?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel ? `View full screen: ${accessibilityLabel}` : 'View image full screen'}
      >
        <Image source={{ uri }} style={style} />
      </Pressable>
      <ImageLightbox images={[uri]} index={open ? 0 : null} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  page: { alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', right: 16, padding: 8, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)' },
  counter: { position: 'absolute', alignSelf: 'center', color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});

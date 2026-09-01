import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Images } from 'lucide-react-native';
import { Card, Text, useAppTheme } from '@asaplocal/ui-native';

export type PhotoPickerOptions = Omit<ImagePicker.ImagePickerOptions, 'mediaTypes'>;

/**
 * Shared "how do you want to add a photo?" flow for every picture-upload
 * spot in the app (business logo/photos, job-sheet entries, dispute
 * evidence, supplies, staff ID photos, portfolio) — previously each of
 * those only offered the photo library, with no way to snap a new photo on
 * the spot. Camera capture is inherently one-shot, so
 * `allowsMultipleSelection`/`selectionLimit` in `options` only apply to the
 * library branch; the camera always returns a single asset.
 *
 * Usage: const { pick, sheet } = usePhotoPicker(); ... await pick(options)
 * returns the picked assets (or [] if cancelled/denied); render {sheet}
 * once anywhere in the component tree.
 */
export function usePhotoPicker() {
  const [visible, setVisible] = useState(false);
  const resolverRef = useRef<((assets: ImagePicker.ImagePickerAsset[]) => void) | null>(null);
  const optionsRef = useRef<PhotoPickerOptions>({});

  function pick(options: PhotoPickerOptions = {}): Promise<ImagePicker.ImagePickerAsset[]> {
    optionsRef.current = options;
    setVisible(true);
    return new Promise((resolve) => {
      resolverRef.current = resolve;
    });
  }

  function finish(assets: ImagePicker.ImagePickerAsset[]) {
    setVisible(false);
    resolverRef.current?.(assets);
    resolverRef.current = null;
  }

  async function fromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return finish([]);
    const { allowsMultipleSelection, selectionLimit, ...rest } = optionsRef.current;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], ...rest });
    finish(result.canceled ? [] : result.assets);
  }

  async function fromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return finish([]);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], ...optionsRef.current });
    finish(result.canceled ? [] : result.assets);
  }

  const sheet = (
    <PhotoSourceSheet visible={visible} onCamera={fromCamera} onLibrary={fromLibrary} onClose={() => finish([])} />
  );

  return { pick, sheet };
}

function PhotoSourceSheet({
  visible,
  onCamera,
  onLibrary,
  onClose,
}: {
  visible: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Card style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <Text variant="smallMedium" color="muted" style={styles.title}>
            Add a photo
          </Text>
          <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={onCamera}>
            <Camera size={20} color={colors.foreground} />
            <Text variant="small">Take photo</Text>
          </Pressable>
          <Pressable style={[styles.row, { borderColor: colors.border }]} onPress={onLibrary}>
            <Images size={20} color={colors.foreground} />
            <Text variant="small">Choose from library</Text>
          </Pressable>
          <Pressable style={styles.cancelRow} onPress={onClose}>
            <Text variant="small" color="muted">
              Cancel
            </Text>
          </Pressable>
        </Card>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 0, gap: 0 },
  title: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  cancelRow: { alignItems: 'center', paddingVertical: 14 },
});

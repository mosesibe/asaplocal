import { View, StyleSheet } from 'react-native';
import { Card, Text } from '@asaplocal/ui-native';

// react-native-maps has no web implementation (its native-component codegen
// crashes react-native-web's bundle entirely) — Metro picks this .web.tsx
// file over RadarMap.tsx automatically when bundling for web, so this only
// ever affects `expo start --web` preview/dev, never the real native app.
export function RadarMap() {
  return (
    <Card style={styles.card}>
      <View style={styles.placeholder}>
        <Text variant="small" color="muted">
          Map preview is only available on the mobile app
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: 0, overflow: 'hidden' },
  placeholder: { height: 280, alignItems: 'center', justifyContent: 'center' },
});

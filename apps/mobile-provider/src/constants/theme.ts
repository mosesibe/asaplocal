import { Platform } from 'react-native';

// Design tokens (colors, spacing, radii, fonts) live in @asaplocal/ui-native
// now — this file just keeps the couple of values specific to this app's
// native chrome that don't belong in a cross-app package.
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;

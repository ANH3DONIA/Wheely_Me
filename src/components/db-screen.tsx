import { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Marco común de las pantallas conectadas a la base de datos (menú, ranking, tienda).
export function DbScreen({
  title,
  children,
  onBack,
}: {
  title: string;
  children: ReactNode;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 15),
          paddingBottom: Math.max(insets.bottom, 15),
          paddingLeft: Math.max(insets.left, 20),
          paddingRight: Math.max(insets.right, 20),
        },
      ]}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.back}>
            <Text style={styles.backText}>← Volver</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.back} />
        )}
        <Text style={styles.title}>{title}</Text>
        <View style={styles.back} />
      </View>
      <View style={styles.body}>{children}</View>
    </View>
  );
}

export const dbStyles = StyleSheet.create({
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 28,
    alignItems: 'center',
  },
  buttonAlt: { backgroundColor: '#3F51B5' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  text: { color: '#fff', fontSize: 16 },
  muted: { color: '#9AA3C7', fontSize: 14 },
  error: { color: '#FF8A80', fontSize: 14, textAlign: 'center' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E27' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  back: { width: 90 },
  backText: { color: '#9AA3C7', fontSize: 16 },
  title: { color: '#fff', fontSize: 26, fontWeight: 'bold' },
  body: { flex: 1, marginTop: 10 },
});

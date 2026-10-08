import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { DbScreen, dbStyles } from '@/components/db-screen';
import { getLeaderboard, LeaderboardRow } from '@/lib/db';

export default function LeaderboardScreen() {
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getLeaderboard()
      .then(setRows)
      .catch(() => setError('No se pudo cargar el ranking.'));
  }, []);

  return (
    <DbScreen title="Ranking global" onBack={() => router.back()}>
      {error !== '' ? (
        <Text style={[dbStyles.error, styles.msg]}>{error}</Text>
      ) : rows === null ? (
        <ActivityIndicator color="#fff" size="large" style={styles.msg} />
      ) : rows.length === 0 ? (
        <Text style={[dbStyles.muted, styles.msg]}>Aún no hay partidas. ¡Sé el primero!</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => String(r.rank)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={[dbStyles.text, styles.rank]}>#{item.rank}</Text>
              <Text style={[dbStyles.text, styles.name]}>{item.username}</Text>
              <Text style={[dbStyles.text, styles.score]}>{item.best_score}</Text>
            </View>
          )}
        />
      )}
    </DbScreen>
  );
}

const styles = StyleSheet.create({
  msg: { marginTop: 40, alignSelf: 'center' },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#161B3D',
    borderRadius: 12,
    marginBottom: 8,
  },
  rank: { width: 60, fontWeight: 'bold' },
  name: { flex: 1 },
  score: { fontWeight: 'bold' },
});

import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { DbScreen, dbStyles } from '@/components/db-screen';
import { createProfile, getProfile, Profile } from '@/lib/db';

export default function MenuScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfile(await getProfile());
    } catch {
      setError('No se pudo conectar con la base de datos. Revisa tu internet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    getProfile()
      .then(setProfile)
      .catch(() => setError('No se pudo conectar con la base de datos. Revisa tu internet.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    const name = username.trim();
    if (name.length < 3 || name.length > 20) {
      setError('El nombre debe tener entre 3 y 20 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      setProfile(await createProfile(name));
    } catch (e: any) {
      // 23505 = unique_violation (nombre ya usado)
      setError(e?.code === '23505' ? 'Ese nombre ya está en uso.' : 'No se pudo crear tu perfil.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DbScreen title="Wheely Me">
        <View style={styles.center}>
          <ActivityIndicator color="#fff" size="large" />
        </View>
      </DbScreen>
    );
  }

  // Error de conexión sin perfil cargado: permitir reintentar
  if (!profile && error !== '') {
    return (
      <DbScreen title="Wheely Me">
        <View style={styles.center}>
          <Text style={dbStyles.error}>{error}</Text>
          <TouchableOpacity style={dbStyles.button} onPress={load}>
            <Text style={dbStyles.buttonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </DbScreen>
    );
  }

  // Primera vez: pedir nombre de jugador
  if (!profile) {
    return (
      <DbScreen title="Crea tu jugador">
        <View style={styles.center}>
          <TextInput
            style={styles.input}
            placeholder="Nombre de usuario"
            placeholderTextColor="#6B749C"
            value={username}
            onChangeText={setUsername}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[dbStyles.button, saving && dbStyles.buttonDisabled]}
            onPress={handleCreate}
            disabled={saving}>
            <Text style={dbStyles.buttonText}>{saving ? 'Guardando...' : 'Continuar'}</Text>
          </TouchableOpacity>
        </View>
      </DbScreen>
    );
  }

  return (
    <DbScreen title="Wheely Me">
      <View style={styles.center}>
        <Text style={dbStyles.text}>
          {profile.username}  ·  🪙 {profile.coins}
        </Text>
        <View style={styles.row}>
          <TouchableOpacity style={dbStyles.button} onPress={() => router.replace('/game')}>
            <Text style={dbStyles.buttonText}>Jugar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dbStyles.button, dbStyles.buttonAlt]}
            onPress={() => router.push('/leaderboard')}>
            <Text style={dbStyles.buttonText}>Ranking</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[dbStyles.button, dbStyles.buttonAlt]}
            onPress={() => router.push('/shop')}>
            <Text style={dbStyles.buttonText}>Tienda</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DbScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  row: { flexDirection: 'row', gap: 14 },
  input: {
    width: 280,
    backgroundColor: '#161B3D',
    color: '#fff',
    fontSize: 18,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
  },
});

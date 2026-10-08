import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { DbScreen, dbStyles } from '@/components/db-screen';
import {
  buySkinWithCoins,
  equipSkin,
  getOwnedSkinIds,
  getProfile,
  getSkins,
  Profile,
  Skin,
} from '@/lib/db';

export default function ShopScreen() {
  const [skins, setSkins] = useState<Skin[]>([]);
  const [owned, setOwned] = useState<number[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getSkins(), getOwnedSkinIds(), getProfile()])
      .then(([s, o, p]) => {
        setSkins(s);
        setOwned(o);
        setProfile(p);
      })
      .catch(() => setError('No se pudo cargar la tienda.'))
      .finally(() => setLoading(false));
  }, []);

  const run = async (action: () => Promise<Profile>) => {
    setBusy(true);
    setError('');
    try {
      setProfile(await action());
      setOwned(await getOwnedSkinIds());
    } catch (e: any) {
      setError(e?.message ?? 'Ocurrió un error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <DbScreen title={`Tienda  🪙 ${profile?.coins ?? 0}`} onBack={() => router.back()}>
      {loading ? (
        <ActivityIndicator color="#fff" size="large" style={styles.loader} />
      ) : (
        <>
          {error !== '' && <Text style={dbStyles.error}>{error}</Text>}
          <ScrollView horizontal contentContainerStyle={styles.list}>
            {skins.map((skin) => {
              const isOwned = owned.includes(skin.id);
              const isEquipped = profile?.equipped_skin_id === skin.id;
              const canBuyWithCoins = skin.price_coins !== null;
              return (
                <View key={skin.id} style={styles.card}>
                  <View style={[styles.swatch, { backgroundColor: skin.color }]} />
                  <Text style={dbStyles.text}>{skin.name}</Text>
                  {isOwned ? (
                    <TouchableOpacity
                      style={[dbStyles.button, styles.btn, (isEquipped || busy) && dbStyles.buttonDisabled]}
                      disabled={isEquipped || busy}
                      onPress={() => run(() => equipSkin(skin.id))}>
                      <Text style={dbStyles.buttonText}>{isEquipped ? 'Equipada' : 'Equipar'}</Text>
                    </TouchableOpacity>
                  ) : canBuyWithCoins ? (
                    <TouchableOpacity
                      style={[dbStyles.button, dbStyles.buttonAlt, styles.btn, busy && dbStyles.buttonDisabled]}
                      disabled={busy}
                      onPress={() => run(() => buySkinWithCoins(skin.id))}>
                      <Text style={dbStyles.buttonText}>🪙 {skin.price_coins}</Text>
                    </TouchableOpacity>
                  ) : (
                    // Los pagos con dinero real (Stripe) los integra el equipo de pagos.
                    <Text style={dbStyles.muted}>
                      ${((skin.price_cents ?? 0) / 100).toFixed(2)} MXN · pronto
                    </Text>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </DbScreen>
  );
}

const styles = StyleSheet.create({
  loader: { marginTop: 40 },
  list: { gap: 14, alignItems: 'center', paddingVertical: 10 },
  card: {
    width: 150,
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#161B3D',
    borderRadius: 16,
  },
  swatch: { width: 70, height: 40, borderRadius: 10 },
  btn: { paddingVertical: 8, paddingHorizontal: 18 },
});

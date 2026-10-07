import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AuthScreen() {
  // const { width: SCREEN_WIDTH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [statusMessage, setStatusMessage] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hardwareAvailable, setHardwareAvailable] = useState(true);
  const [biometricEnrolled, setBiometricEnrolled] = useState(true);

  // Verificar soporte de hardware al montar
  useEffect(() => {
    const checkBiometricSupport = async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      setHardwareAvailable(hasHardware);

      if (!hasHardware) {
        setStatusMessage('Este dispositivo no soporta autenticación biométrica.');
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricEnrolled(isEnrolled);

      if (!isEnrolled) {
        setStatusMessage(
          'No tienes huella digital configurada.\nVe a Ajustes > Seguridad para configurarla.'
        );
      }
    };

    checkBiometricSupport();
  }, []);

  const handleAuthenticate = useCallback(async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    setStatusMessage('');

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Verifica tu identidad para jugar',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        // Autenticación exitosa → ir al juego
        router.replace('/game');
      } else {
        // Manejar los distintos tipos de error/cancelación
        if (result.error === 'user_cancel') {
          setStatusMessage('Autenticación cancelada.');
        } else if (result.error === 'not_enrolled') {
          setStatusMessage(
            'No tienes huella digital configurada.\nVe a Ajustes > Seguridad para configurarla.'
          );
        } else if (result.error === 'not_available') {
          setStatusMessage('La autenticación biométrica no está disponible.');
        } else if (result.error === 'lockout') {
          setStatusMessage('Demasiados intentos fallidos.\nIntenta de nuevo más tarde.');
        } else {
          setStatusMessage('Autenticación fallida. Intenta de nuevo.');
        }
      }
    } catch {
      setStatusMessage('Ocurrió un error inesperado.');
    } finally {
      setIsAuthenticating(false);
    }
  }, [isAuthenticating]);

  const canAuthenticate = hardwareAvailable && biometricEnrolled;

  return (
    <View style={[styles.container, {
      paddingLeft: Math.max(insets.left, 20),
      paddingRight: Math.max(insets.right, 20),
      paddingTop: Math.max(insets.top, 15),
      paddingBottom: Math.max(insets.bottom, 15),
    }]}>
      {/* Fondo decorativo con gradiente simulado */}
      <View style={styles.bgGlow} />

      {/* Contenido principal */}
      <View style={styles.content}>
        {/* Ícono de candado */}
        <View style={styles.lockIconContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>

        {/* Título de la app */}
        <Text style={styles.appTitle}>Wheely Me</Text>

        {/* Mensaje principal */}
        <Text style={styles.mainMessage}>No queremos que toquen tu progreso</Text>

        {/* Botón de autenticación */}
        {canAuthenticate ? (
          <TouchableOpacity
            style={[styles.authButton, isAuthenticating && styles.authButtonDisabled]}
            onPress={handleAuthenticate}
            activeOpacity={0.7}
            disabled={isAuthenticating}
          >
            <Text style={styles.authButtonIcon}>👆</Text>
            <Text style={styles.authButtonText}>
              {isAuthenticating ? 'Verificando...' : 'Iniciar con huella digital'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.unavailableContainer}>
            <Text style={styles.unavailableIcon}>⚠️</Text>
            <Text style={styles.unavailableText}>
              {!hardwareAvailable
                ? 'Este dispositivo no soporta autenticación biométrica.'
                : 'Configura tu huella digital en Ajustes > Seguridad.'}
            </Text>
          </View>
        )}

        {/* Mensaje de estado */}
        {statusMessage !== '' && (
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgGlow: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: 'rgba(32, 138, 239, 0.12)',
    top: '20%',
    alignSelf: 'center',
  },
  content: {
    alignItems: 'center',
    maxWidth: 500,
    paddingHorizontal: 30,
  },
  lockIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  lockIcon: {
    fontSize: 36,
  },
  appTitle: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: 2,
    textShadowColor: 'rgba(32, 138, 239, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  mainMessage: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 36,
    lineHeight: 26,
    fontWeight: '500',
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#208AEF',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 32,
    elevation: 6,
    shadowColor: '#208AEF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    gap: 12,
  },
  authButtonDisabled: {
    opacity: 0.6,
  },
  authButtonIcon: {
    fontSize: 24,
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  unavailableContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,70,70,0.1)',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,70,70,0.2)',
  },
  unavailableIcon: {
    fontSize: 28,
    marginBottom: 10,
  },
  unavailableText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  statusMessage: {
    marginTop: 20,
    fontSize: 14,
    color: '#FF7043',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});

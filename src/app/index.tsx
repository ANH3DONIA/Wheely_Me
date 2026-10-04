import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer, LightSensor } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Ancho máximo estimado para generar estrellas uniformemente sin depender del ancho inicial de la pantalla
const MAX_BG_WIDTH = 2000;

const NUM_STARS = 40;
const STARS = Array.from({ length: NUM_STARS }).map(() => ({
  top: Math.random() * 200,
  left: Math.random() * MAX_BG_WIDTH,
  size: Math.random() * 3 + 1,
}));

// Nubes: ahora usamos posiciones absolutas más separadas para landscape (pantalla más ancha)
const CLOUDS = [
  { top: 18, left: 100 },
  { top: 55, left: 600 },
  { top: 25, left: 1200 }, // Añadimos una nube extra para rellenar la pantalla horizontal
];

// Nube caricaturizada: base plana + burbujas uniformes encima
function Cloud({ top, left }: { top: number; left: number }) {
  return (
    <View style={{ position: 'absolute', top, left }}>
      {/* Burbujas superiores: 5 círculos uniformes bien alineados */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginLeft: 8 }}>
        <View style={{ width: 30, height: 30, backgroundColor: '#fff', borderRadius: 15, marginRight: -4 }} />
        <View style={{ width: 38, height: 38, backgroundColor: '#fff', borderRadius: 19, marginRight: -4 }} />
        <View style={{ width: 44, height: 44, backgroundColor: '#fff', borderRadius: 22, marginRight: -4 }} />
        <View style={{ width: 30, height: 30, backgroundColor: '#fff', borderRadius: 15, marginRight: -4 }} />
      </View>
      {/* Base plana: rectángulo que une todo por abajo */}
      <View style={{
        width: 148, height: 28,
        backgroundColor: '#fff',
        borderRadius: 14,
        marginTop: -14,
      }} />
    </View>
  );
}

export default function WheelyMeGame() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const [carX, setCarX] = useState(0);
  const [carAngle, setCarAngle] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState('');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [tiltDisplay, setTiltDisplay] = useState('0°');
  const [lightDisplay, setLightDisplay] = useState('0 lx');
  const [backgroundColor, setBackgroundColor] = useState('#87CEEB');
  const [starOpacity, setStarOpacity] = useState(0);

  const velocityX = useRef(0);
  const velocityAngle = useRef(0);
  const loopRef = useRef<number>(null);

  // Gyroscope / Accelerometer references
  const tiltRef = useRef(0);
  const calibratedZeroRef = useRef(0);

  // Cargar récord guardado al iniciar
  useEffect(() => {
    AsyncStorage.getItem('highScore').then(value => {
      if (value !== null) setHighScore(parseInt(value, 10));
    });
  }, []);

  // Setup Accelerometer
  useEffect(() => {
    let isMounted = true;
    Accelerometer.setUpdateInterval(50);
    const subscription = Accelerometer.addListener(data => {
      if (!isMounted) return;
      // En landscape, el eje Y (data.y) es el que detecta la inclinación de "volante" (izquierda/derecha).
      const tiltDegrees = (data.y * 90);
      tiltRef.current = tiltDegrees;

      const adjustedTilt = tiltDegrees - calibratedZeroRef.current;
      const direction = adjustedTilt < 0 ? '←' : '→';
      setTiltDisplay(`Giroscopio: ${direction} ${Math.abs(Math.round(adjustedTilt))}°`);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  // Setup LightSensor
  useEffect(() => {
    let subscription: any;
    let isMounted = true;

    // Algunos dispositivos no soportan sensor de luz. Verificamos primero.
    LightSensor.isAvailableAsync().then(isAvailable => {
      if (!isMounted) return;

      if (isAvailable) {
        // Aumentamos un poco la frecuencia de actualización para que se sienta más responsivo
        LightSensor.setUpdateInterval(300);
        subscription = LightSensor.addListener(({ illuminance }) => {
          if (!isMounted) return;
          setLightDisplay(`Luz: ${Math.round(illuminance)} lx`);

          // En Android, los sensores varían muchísimo. Algunos leen 100 lux en un cuarto oscuro
          // y otros 5000 lux con luz normal. Amplié drásticamente los rangos para que notes
          // el cambio. Por favor, mira los números en pantalla para calibrarlo con precisión.
          if (illuminance < 10) {
            setBackgroundColor('#000022'); // Muy oscuro (Noche)
          } else if (illuminance < 500) {
            setBackgroundColor('#4169E1'); // Oscuro (Atardecer)
          } else if (illuminance < 2500) {
            setBackgroundColor('#87CEEB'); // Normal (Día claro en interiores)
          } else {
            setBackgroundColor('#E0FFFF'); // Muy claro (Sol / Linterna directa)
          }

          // Estrellas: Solo se ven si es "de noche" (illuminance < 800)
          // La opacidad va de 0 a 1 dependiendo de qué tan oscuro esté.
          if (illuminance >= 800) {
            setStarOpacity(0);
          } else {
            setStarOpacity(1 - (illuminance / 800));
          }
        });
      } else {
        setLightDisplay('Luz: No soportado');
      }
    });

    return () => {
      isMounted = false;
      if (subscription) subscription.remove();
    };
  }, []);

  // Game loop
  useEffect(() => {
    if (gameOver) return;

    let lastTime = Date.now();

    const tick = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Calculate adjusted tilt
      const currentTilt = tiltRef.current - calibratedZeroRef.current;

      // --- Movimiento horizontal ---
      // El giroscopio SOLO controla la velocidad horizontal, NO la rotación.
      if (Math.abs(currentTilt) > 3) {
        const factor = currentTilt / 30;
        velocityX.current += 150 * factor * dt;
      } else {
        velocityX.current *= 0.95; // Fricción al estar plano
      }
      // Amortiguación natural de la velocidad horizontal (resistencia del aire / ruedas)
      velocityX.current *= 0.99;

      // --- Física de rotación tipo vehículo ---
      // La gravedad actúa como un RESORTE que intenta devolver el carrito a 0°.
      // Mientras el ángulo sea pequeño, lo corrige. Si pasa el punto crítico, lo tumba.
      const TIPPING_ANGLE = 35; // Ángulo a partir del cual el carrito empieza a caer sin control
      const GRAVITY_RESTORE = 120; // Fuerza con la que la gravedad lo endereza
      const GRAVITY_TOPPLE  = 180; // Fuerza con la que la gravedad lo tumba si ya pasó el umbral

      const carAngleSnapshot = carAngle; // valor actual del ángulo para usar en los cálculos

      if (Math.abs(carAngleSnapshot) < TIPPING_ANGLE) {
        // Dentro del rango seguro: la gravedad RESTAURA hacia 0°
        velocityAngle.current -= carAngleSnapshot * GRAVITY_RESTORE * dt;
      } else {
        // Pasó el punto crítico: la gravedad lo TUMBA en la misma dirección
        velocityAngle.current += Math.sign(carAngleSnapshot) * GRAVITY_TOPPLE * dt;
      }

      // Amortiguación angular (las ruedas / suspensión absorben oscilaciones)
      velocityAngle.current *= 0.88;

      // Pequeño impulso de desequilibrio por velocidad lateral alta
      // (simula que el carrito se desequilibra un poco cuando va muy rápido)
      const speedFactor = Math.abs(velocityX.current) / 400;
      if (speedFactor > 0.5) {
        velocityAngle.current += Math.sign(velocityX.current) * speedFactor * 8 * dt;
      }

      setCarX(prev => prev + velocityX.current * dt);

      setCarAngle(prev => {
        const newAngle = prev + velocityAngle.current * dt;
        // Game over if tilted beyond 70 degrees
        if (Math.abs(newAngle) > 70) {
          setGameOver(true);
          setGameOverReason('¡Inclinaste demasiado el carrito y se volteó!');
          // Comparar y guardar récord
          setScore(currentScore => {
            const finalScore = Math.floor(currentScore);
            setHighScore(prevHigh => {
              if (finalScore > prevHigh) {
                AsyncStorage.setItem('highScore', String(finalScore));
                return finalScore;
              }
              return prevHigh;
            });
            return currentScore;
          });
        }
        return newAngle;
      });

      setScore(prev => prev + (Math.abs(velocityX.current) * dt) * 0.1);

      loopRef.current = requestAnimationFrame(tick);
    };

    loopRef.current = requestAnimationFrame(tick);

    return () => {
      if (loopRef.current) cancelAnimationFrame(loopRef.current);
    };
  }, [gameOver]);

  const handleRestart = () => {
    setCarX(0);
    setCarAngle(0);
    setGameOver(false);
    setGameOverReason('');
    setScore(0);
    velocityX.current = 0;
    velocityAngle.current = 0;
  };

  const handleCalibrate = () => {
    calibratedZeroRef.current = tiltRef.current;
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.gameArea}>
        {/* Estrellas dinámicas en el fondo (Parallax lento) */}
        <View style={[StyleSheet.absoluteFill, { opacity: starOpacity }]}>
          {STARS.map((star, i) => {
            // Evitar que aparezcan de golpe calculando un área de renderizado ligeramente más grande que la pantalla
            const wrapWidth = SCREEN_WIDTH + 50;
            const starX = ((star.left - carX * 0.1) % wrapWidth + wrapWidth) % wrapWidth - 25;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  top: star.top,
                  left: starX,
                  width: star.size,
                  height: star.size,
                  backgroundColor: '#FFF',
                  borderRadius: star.size / 2,
                }}
              />
            );
          })}
        </View>

        {/* Nubes - siempre visibles (Parallax medio) */}
        {CLOUDS.map((cloud, i) => {
          const wrapWidth = SCREEN_WIDTH + 200; 
          const cloudX = ((cloud.left - carX * 0.3) % wrapWidth + wrapWidth) % wrapWidth - 150;
          return <Cloud key={`cloud-${i}`} top={cloud.top} left={cloudX} />;
        })}

        {/* Terreno con marcas para notar el movimiento de la cámara (Parallax 1:1) */}
        <View style={styles.terrain}>
          {Array.from({ length: Math.ceil(SCREEN_WIDTH / 50) + 2 }).map((_, i) => {
            const wrapWidth = SCREEN_WIDTH + 60;
            const markerX = (((i * 50) - carX) % wrapWidth + wrapWidth) % wrapWidth - 30;
            return (
              <View 
                key={`marker-${i}`} 
                style={{
                  position: 'absolute', 
                  top: 8, 
                  left: markerX, 
                  width: 15, 
                  height: 4, 
                  backgroundColor: '#388E3C', 
                  borderRadius: 2
                }} 
              />
            );
          })}
        </View>

        {/* Car - Ahora permanece fijo en el centro horizontalmente (la cámara lo sigue) */}
        <View style={[styles.carContainer, { transform: [{ translateX: SCREEN_WIDTH / 2 - 30 }, { rotate: `${carAngle}deg` }] }]}>
          <View style={styles.characterPlaceholder} />
          <View style={styles.carBody} />
          <View style={styles.wheelsContainer}>
            <View style={styles.wheel} />
            <View style={styles.wheel} />
          </View>
        </View>
      </View>

      {/* Interfaz de usuario superior (HUD) adaptada para landscape con Safe Areas */}
      <View style={[styles.hudContainer, { 
        paddingTop: Math.max(insets.top, 15), 
        paddingLeft: Math.max(insets.left, 20), 
        paddingRight: Math.max(insets.right, 20) 
      }]}>
        <Text style={styles.title}>Wheely Me</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>Puntaje: {Math.floor(score)}</Text>
          <Text style={styles.highScore}>Récord: {highScore}</Text>
        </View>
      </View>

      {/* Indicadores de sensores adaptados para que no estorben */}
      <View style={[styles.sensorIndicator, { 
        bottom: Math.max(insets.bottom, 15), 
        left: Math.max(insets.left, 20) 
      }]}>
        <Text style={styles.sensorText}>{tiltDisplay}</Text>
        <Text style={styles.sensorText}>{lightDisplay}</Text>
      </View>

      {gameOver && (
        <View style={styles.gameOverContainer}>
          <Text style={styles.gameOverText}>¡Fin del juego!</Text>
          <Text style={styles.gameOverReason}>{gameOverReason}</Text>
          {Math.floor(score) >= highScore && highScore > 0 && (
            <Text style={styles.newRecordText}>¡Nuevo récord! 🏆</Text>
          )}
          <Text style={styles.gameOverScore}>Puntaje: {Math.floor(score)}</Text>
          <Text style={styles.gameOverScore}>Récord: {highScore}</Text>
          <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
            <Text style={styles.restartButtonText}>Reiniciar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Botón de calibración flotante en la esquina inferior derecha */}
      <TouchableOpacity 
        style={[styles.calibrateButton, { 
          bottom: Math.max(insets.bottom, 15), 
          right: Math.max(insets.right, 20) 
        }]} 
        onPress={handleCalibrate}
      >
        <Text style={styles.calibrateIcon}>⚖️</Text>
        <Text style={styles.calibrateText}>Centrar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  highScore: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  sensorIndicator: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    zIndex: 10,
  },
  sensorText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  terrain: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60, // Terreno más bajo para ver más fondo
    backgroundColor: '#4CAF50', // Color de pasto más vibrante
    borderTopWidth: 5,
    borderTopColor: '#2E8B57', // Borde oscuro superior para darle un toque de volumen
  },
  carContainer: {
    position: 'absolute',
    bottom: 60, // Posicionado exactamente sobre el nivel del terreno
    width: 80,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  characterPlaceholder: {
    width: 24,
    height: 24,
    backgroundColor: '#FFD700', // Gold character
    borderRadius: 12,
    marginBottom: -8,
    zIndex: 1,
  },
  carBody: {
    width: 80,
    height: 30,
    backgroundColor: '#FF4500', // Orange red car
    borderRadius: 8,
  },
  wheelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 60,
    position: 'absolute',
    bottom: -10,
  },
  wheel: {
    width: 22,
    height: 22,
    backgroundColor: '#333',
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  calibrateButton: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.85)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calibrateIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  calibrateText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  gameOverContainer: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: 40,
  },
  gameOverText: {
    fontSize: 50,
    color: '#FF3333',
    fontWeight: 'bold',
    marginBottom: 10,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  gameOverReason: {
    fontSize: 18,
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  newRecordText: {
    fontSize: 22,
    color: '#FFD700',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  gameOverScore: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 4,
  },
  restartButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
  },
  restartButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Accelerometer, LightSensor } from 'expo-sensors';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const NUM_STARS = 40;
const STARS = Array.from({ length: NUM_STARS }).map(() => ({
  top: Math.random() * 200,
  left: Math.random() * SCREEN_WIDTH,
  size: Math.random() * 3 + 1,
}));

// Nubes: posición fija, menos nubes pero más estéticas
const CLOUDS = [
  { top: 18, left: SCREEN_WIDTH * 0.04 },
  { top: 55, left: SCREEN_WIDTH * 0.55 },
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
  const [carX, setCarX] = useState(SCREEN_WIDTH / 2 - 30);
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
      // Invertimos el eje X para que coincida con el movimiento real del dispositivo
      const tiltDegrees = -(data.x * 90);
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

          // Estrellas: Solo se ven si es "de noche" (illuminance < 1000)
          // La opacidad va de 0 a 1 dependiendo de qué tan oscuro esté.
          if (illuminance >= 1000) {
            setStarOpacity(0);
          } else {
            setStarOpacity(1 - (illuminance / 1000));
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

      // Update velocities based on tilt (sensor input)
      // If tilted right (positive), accelerate right. If left (negative), accelerate left.
      // We apply a deadzone of roughly 3 degrees to avoid jitter when holding still
      if (Math.abs(currentTilt) > 3) {
        // factor determines how fast it accelerates based on tilt angle
        const factor = currentTilt / 30; // 30 degrees tilt is 1x factor
        velocityX.current += 150 * factor * dt;
        velocityAngle.current += 80 * factor * dt;
      } else {
        // Friction when nearly flat
        velocityX.current *= 0.95;
      }

      // Gravity / Balance effect on angle
      // The car naturally wants to tilt more if it's already tilted
      velocityAngle.current += carAngle * 2 * dt;
      velocityAngle.current *= 0.92; // Angular damping

      setCarX(prev => {
        let newX = prev + velocityX.current * dt;
        const CAR_WIDTH = 80;

        // Si sale completamente por la derecha, reaparece justo fuera por la izquierda
        if (newX > SCREEN_WIDTH) {
          newX = -CAR_WIDTH;
        }
        // Si sale completamente por la izquierda, reaparece justo fuera por la derecha
        else if (newX < -CAR_WIDTH) {
          newX = SCREEN_WIDTH;
        }

        return newX;
      });

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
    setCarX(SCREEN_WIDTH / 2 - 30);
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
      <Text style={styles.title}>Wheely Me</Text>
      <Text style={styles.score}>Puntaje: {Math.floor(score)}</Text>
      <Text style={styles.highScore}>Récord: {highScore}</Text>

      {/* Sensor Indicator */}
      <View style={styles.sensorIndicator}>
        <Text style={styles.sensorText}>{tiltDisplay}</Text>
        <Text style={styles.sensorText}>{lightDisplay}</Text>
      </View>

      <View style={styles.gameArea}>
        {/* Estrellas dinámicas en el fondo */}
        <View style={[StyleSheet.absoluteFill, { opacity: starOpacity }]}>
          {STARS.map((star, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                top: star.top,
                left: star.left,
                width: star.size,
                height: star.size,
                backgroundColor: '#FFF',
                borderRadius: star.size / 2,
              }}
            />
          ))}
        </View>

        {/* Nubes - siempre visibles */}
        {CLOUDS.map((cloud, i) => (
          <Cloud key={`cloud-${i}`} top={cloud.top} left={cloud.left} />
        ))}

        {/* Simple Slope Terrain */}
        <View style={styles.terrain} />

        {/* Car */}
        <View style={[styles.carContainer, { transform: [{ translateX: carX }, { rotate: `${carAngle}deg` }] }]}>
          <View style={styles.characterPlaceholder} />
          <View style={styles.carBody} />
          <View style={styles.wheelsContainer}>
            <View style={styles.wheel} />
            <View style={styles.wheel} />
          </View>
        </View>
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

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.controlButton} onPress={handleCalibrate}>
          <Text style={styles.controlText}>Calibrar Centro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  score: {
    fontSize: 20,
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
  },
  highScore: {
    fontSize: 16,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 6,
  },
  sensorIndicator: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignSelf: 'center',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
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
    height: 140, // La altura justa para que el carrito quede posado encima
    backgroundColor: '#4CAF50', // Color de pasto más vibrante
    borderTopWidth: 5,
    borderTopColor: '#2E8B57', // Borde oscuro superior para darle un toque de volumen
  },
  carContainer: {
    position: 'absolute',
    bottom: 140, // Posicionado exactamente sobre el nivel del terreno
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
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  controlButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  controlText: {
    fontSize: 18,
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

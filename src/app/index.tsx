import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function WheelyMeGame() {
  const [carX, setCarX] = useState(SCREEN_WIDTH / 2 - 30);
  const [carAngle, setCarAngle] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  
  const velocityX = useRef(0);
  const velocityAngle = useRef(0);
  const loopRef = useRef<number>(null);
  const isMovingRight = useRef(false);
  const isMovingLeft = useRef(false);

  // Game loop
  useEffect(() => {
    if (gameOver) return;

    let lastTime = Date.now();
    
    const tick = () => {
      const now = Date.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Update velocities based on input
      if (isMovingRight.current) {
        velocityX.current += 150 * dt;
        velocityAngle.current += 80 * dt; // Tilts back when accelerating forward
      } else if (isMovingLeft.current) {
        velocityX.current -= 150 * dt;
        velocityAngle.current -= 80 * dt; 
      } else {
        // Friction
        velocityX.current *= 0.95;
      }
      
      // Gravity / Balance effect on angle
      // The car naturally wants to tilt more if it's already tilted
      velocityAngle.current += carAngle * 2 * dt; 
      velocityAngle.current *= 0.92; // Angular damping
      
      setCarX(prev => {
        let newX = prev + velocityX.current * dt;
        // Simple bounds checking to wrap around the screen
        if (newX > SCREEN_WIDTH) newX = -60;
        if (newX < -60) newX = SCREEN_WIDTH;
        return newX;
      });
      
      setCarAngle(prev => {
        const newAngle = prev + velocityAngle.current * dt;
        // Game over if tilted beyond 70 degrees
        if (Math.abs(newAngle) > 70) {
          setGameOver(true);
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
    setScore(0);
    velocityX.current = 0;
    velocityAngle.current = 0;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wheely Me</Text>
      <Text style={styles.score}>Score: {Math.floor(score)}</Text>
      
      <View style={styles.gameArea}>
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
          <Text style={styles.gameOverText}>Game Over!</Text>
          <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
            <Text style={styles.restartButtonText}>Reiniciar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity 
          style={styles.controlButton} 
          onPressIn={() => isMovingLeft.current = true}
          onPressOut={() => isMovingLeft.current = false}
        >
          <Text style={styles.controlText}>Izquierda</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.controlButton} 
          onPressIn={() => isMovingRight.current = true}
          onPressOut={() => isMovingRight.current = false}
        >
          <Text style={styles.controlText}>Derecha</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue background
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
    fontSize: 24,
    textAlign: 'center',
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  gameArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  terrain: {
    position: 'absolute',
    bottom: 50,
    left: -100,
    width: '200%',
    height: 300,
    backgroundColor: '#228B22', // Forest green
    transform: [{ rotate: '-5deg' }], // Slight slope
  },
  carContainer: {
    position: 'absolute',
    bottom: 140, // Positioned on top of the terrain
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
    marginBottom: 30,
    textShadowColor: '#000',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
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
  }
});

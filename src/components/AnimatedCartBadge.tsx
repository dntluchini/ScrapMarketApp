import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

interface AnimatedCartBadgeProps {
  count: number;
  children: React.ReactNode;
}

/**
 * Componente que envuelve el icono del carrito y muestra un badge animado
 * cuando el número de items cambia
 */
export const AnimatedCartBadge: React.FC<AnimatedCartBadgeProps> = ({ count, children }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const previousCount = useRef(count);

  useEffect(() => {
    // Solo animar si el count cambió y es mayor que 0
    if (count !== previousCount.current && count > 0) {
      // Animación de bounce: escala hacia arriba y luego vuelve
      Animated.sequence([
        Animated.spring(scaleAnim, {
          toValue: 1.3,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
    previousCount.current = count;
  }, [count, scaleAnim]);

  return (
    <View style={styles.container}>
      {children}
      {count > 0 && (
        <View style={styles.badge}>
          <Animated.Text
            style={[
              styles.badgeText,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {count > 99 ? '99+' : count}
          </Animated.Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
});


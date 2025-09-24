import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

interface ProductSkeletonProps {
  count?: number;
}

const ProductSkeleton: React.FC<ProductSkeletonProps> = ({ count = 3 }) => {
  const [pulseAnim] = React.useState(new Animated.Value(0.3));

  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, [pulseAnim]);

  const SkeletonCard = () => (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonHeader}>
        <Animated.View style={[styles.skeletonText, styles.skeletonTitle, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.skeletonText, styles.skeletonSubtitle, { opacity: pulseAnim }]} />
      </View>
      
      <View style={styles.skeletonBody}>
        <Animated.View style={[styles.skeletonText, styles.skeletonPrice, { opacity: pulseAnim }]} />
        <Animated.View style={[styles.skeletonText, styles.skeletonStock, { opacity: pulseAnim }]} />
      </View>
      
      <View style={styles.skeletonFooter}>
        {[1, 2, 3].map((i) => (
          <Animated.View key={i} style={[styles.skeletonSupermarket, { opacity: pulseAnim }]} />
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  skeletonCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  skeletonHeader: {
    marginBottom: 12,
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: '#dee2e6',
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  skeletonSubtitle: {
    height: 16,
    backgroundColor: '#dee2e6',
    borderRadius: 4,
    width: '60%',
  },
  skeletonBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  skeletonPrice: {
    height: 24,
    backgroundColor: '#dee2e6',
    borderRadius: 4,
    width: '30%',
  },
  skeletonStock: {
    height: 20,
    backgroundColor: '#dee2e6',
    borderRadius: 4,
    width: '25%',
  },
  skeletonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  skeletonSupermarket: {
    height: 16,
    backgroundColor: '#dee2e6',
    borderRadius: 4,
    width: '28%',
  },
  skeletonText: {
    borderRadius: 4,
  },
});

export default ProductSkeleton;





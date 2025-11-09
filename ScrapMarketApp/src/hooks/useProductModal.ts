import { useState, useCallback } from 'react';

/**
 * Hook personalizado para manejar el estado del modal de productos
 * Optimizado para performance en React Native
 */
export const useProductModal = () => {
  const [showDetails, setShowDetails] = useState(false);

  const openModal = useCallback(() => {
    setShowDetails(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowDetails(false);
  }, []);

  return {
    showDetails,
    openModal,
    closeModal,
  };
};





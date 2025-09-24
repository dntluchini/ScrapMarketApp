-- Script para configurar la base de datos para Cache Predictivo
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columnas para cache predictivo a la tabla products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS predictive_cache BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_cache_update TIMESTAMP DEFAULT NULL,
ADD COLUMN IF NOT EXISTS cache_query VARCHAR(255) DEFAULT NULL;

-- 2. Crear índices para optimizar consultas de cache
CREATE INDEX IF NOT EXISTS idx_products_predictive_cache 
ON products(predictive_cache) 
WHERE predictive_cache = true;

CREATE INDEX IF NOT EXISTS idx_products_last_cache_update 
ON products(last_cache_update) 
WHERE predictive_cache = true;

CREATE INDEX IF NOT EXISTS idx_products_cache_query 
ON products(cache_query) 
WHERE predictive_cache = true;

-- 3. Crear tabla para logs de cache predictivo
CREATE TABLE IF NOT EXISTS predictive_cache_logs (
    id SERIAL PRIMARY KEY,
    query VARCHAR(255) NOT NULL,
    products_found INTEGER DEFAULT 0,
    execution_time INTERVAL,
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Crear índice para logs
CREATE INDEX IF NOT EXISTS idx_cache_logs_created_at 
ON predictive_cache_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_cache_logs_query 
ON predictive_cache_logs(query);

-- 5. Función para limpiar logs antiguos (mantener solo 30 días)
CREATE OR REPLACE FUNCTION cleanup_old_cache_logs()
RETURNS void AS $$
BEGIN
    DELETE FROM predictive_cache_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 6. Crear trigger para limpiar logs automáticamente (opcional)
-- CREATE OR REPLACE FUNCTION trigger_cleanup_cache_logs()
-- RETURNS trigger AS $$
-- BEGIN
--     PERFORM cleanup_old_cache_logs();
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER cleanup_cache_logs_trigger
--     AFTER INSERT ON predictive_cache_logs
--     FOR EACH ROW
--     EXECUTE FUNCTION trigger_cleanup_cache_logs();

-- 7. Vista para productos populares cacheados
CREATE OR REPLACE VIEW popular_cached_products AS
SELECT 
    p.canonid,
    p.canonname,
    p.brand,
    p.exact_weight,
    p.last_cache_update,
    p.cache_query,
    COUNT(DISTINCT r.supermarket_id) as supermarket_count,
    MIN(r.price) as min_price,
    MAX(r.price) as max_price,
    AVG(r.price) as avg_price
FROM products p
LEFT JOIN reg_prices r ON p.product_id = r.product_id
WHERE p.predictive_cache = true
    AND p.last_cache_update > NOW() - INTERVAL '12 hours'
GROUP BY p.canonid, p.canonname, p.brand, p.exact_weight, p.last_cache_update, p.cache_query
ORDER BY p.last_cache_update DESC, supermarket_count DESC;

-- 8. Función para obtener estadísticas de cache
CREATE OR REPLACE FUNCTION get_cache_statistics()
RETURNS TABLE(
    total_cached_products BIGINT,
    cache_hit_rate NUMERIC,
    last_cache_update TIMESTAMP,
    most_cached_queries TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_cached_products,
        ROUND(
            (COUNT(*) FILTER (WHERE p.predictive_cache = true)::NUMERIC / 
             NULLIF(COUNT(*), 0)::NUMERIC) * 100, 2
        ) as cache_hit_rate,
        MAX(p.last_cache_update) as last_cache_update,
        ARRAY_AGG(DISTINCT p.cache_query ORDER BY p.cache_query) FILTER (WHERE p.cache_query IS NOT NULL) as most_cached_queries
    FROM products p
    WHERE p.predictive_cache = true;
END;
$$ LANGUAGE plpgsql;

-- 9. Comentarios para documentación
COMMENT ON COLUMN products.predictive_cache IS 'Indica si el producto fue cacheado por el sistema predictivo';
COMMENT ON COLUMN products.last_cache_update IS 'Timestamp de la última actualización del cache predictivo';
COMMENT ON COLUMN products.cache_query IS 'Query de búsqueda que generó este cache';

COMMENT ON TABLE predictive_cache_logs IS 'Logs de ejecuciones del cache predictivo';
COMMENT ON FUNCTION get_cache_statistics() IS 'Retorna estadísticas del sistema de cache predictivo';
COMMENT ON VIEW popular_cached_products IS 'Vista de productos populares cacheados con estadísticas de precios';

-- 10. Ejemplo de consulta para verificar la configuración
-- SELECT * FROM get_cache_statistics();
-- SELECT * FROM popular_cached_products LIMIT 10;





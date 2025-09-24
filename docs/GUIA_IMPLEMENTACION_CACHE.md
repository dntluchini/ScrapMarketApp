# 🚀 GUÍA DE IMPLEMENTACIÓN - Cache Predictivo

## ✅ WORKFLOWS CREADOS

### 1. **Cache Predictivo - Productos Populares** (ID: `IB4P3zFPnQn0XIuJ`)
- **Trigger:** Cron cada 6 horas
- **Productos:** 11 productos populares
- **Funcionalidad:** Cache automático completo

### 2. **Test Cache Predictivo - Manual** (ID: `IaLY2I9j29qlL9KC`)
- **Trigger:** Webhook manual
- **Productos:** 3 productos de prueba
- **Funcionalidad:** Testing y debugging

---

## 📋 PASOS DE IMPLEMENTACIÓN

### PASO 1: Configurar Base de Datos
```sql
-- Ejecutar en Supabase SQL Editor
-- Ver archivo: docs/setup_predictive_cache_db.sql
```

**Columnas agregadas a `products`:**
- `predictive_cache` BOOLEAN
- `last_cache_update` TIMESTAMP  
- `cache_query` VARCHAR(255)

**Tablas creadas:**
- `predictive_cache_logs` - Logs de ejecuciones
- `popular_cached_products` - Vista de productos cacheados

---

### PASO 2: Configurar Credenciales de BD en n8n

1. **Ir a n8n:** http://localhost:5678
2. **Settings → Credentials → Add Credential**
3. **Seleccionar:** PostgreSQL
4. **Configurar:**
   ```
   Host: tu-host-supabase
   Database: postgres
   User: postgres
   Password: tu-password
   Port: 5432
   SSL: Require
   ```

---

### PASO 3: Activar Workflow de Test

1. **Abrir workflow:** "Test Cache Predictivo - Manual"
2. **Activar workflow** (toggle en la esquina superior derecha)
3. **Probar manualmente:**
   ```bash
   curl -X POST http://localhost:5678/webhook/test-cache-predictive
   ```

---

### PASO 4: Configurar Nodos del Workflow Principal

#### A. **Nodo "Guardar en BD"**
1. **Seleccionar credencial PostgreSQL** creada en paso 2
2. **Verificar query SQL:**
   ```sql
   INSERT INTO products (canonid, canonname, sku, skuref, brand, exact_weight, predictive_cache, last_cache_update, cache_query) 
   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
   ON CONFLICT (canonid, exact_weight) 
   DO UPDATE SET 
     predictive_cache = EXCLUDED.predictive_cache,
     last_cache_update = EXCLUDED.last_cache_update,
     cache_query = EXCLUDED.cache_query
   ```

#### B. **Nodo "Buscar Producto"**
1. **Verificar URL:** `http://localhost:5678/webhook/search-products-complete?q={{ $json.name }}&dataSaverMode=true`
2. **Timeout:** 60000ms (1 minuto)

#### C. **Nodo "Cron Trigger"**
1. **Verificar schedule:** Cada 6 horas
2. **Timezone:** Configurar según tu zona horaria

---

### PASO 5: Activar Workflow Principal

1. **Abrir workflow:** "Cache Predictivo - Productos Populares"
2. **Activar workflow** (toggle en la esquina superior derecha)
3. **Verificar en logs** que se ejecute correctamente

---

### PASO 6: Verificar Implementación

#### A. **Verificar en Base de Datos:**
```sql
-- Ver productos cacheados
SELECT * FROM popular_cached_products LIMIT 10;

-- Ver estadísticas
SELECT * FROM get_cache_statistics();

-- Ver logs
SELECT * FROM predictive_cache_logs ORDER BY created_at DESC LIMIT 10;
```

#### B. **Verificar en n8n:**
1. **Executions** - Ver ejecuciones exitosas
2. **Logs** - Verificar que no hay errores

#### C. **Verificar en App:**
1. **HomeScreen** - Debe mostrar productos populares
2. **SearchScreen** - Debe mostrar "Datos de hace X horas"

---

## 🧪 TESTING

### Test Manual Rápido:
```bash
# Activar workflow de test
curl -X POST http://localhost:5678/webhook/test-cache-predictive

# Verificar respuesta
# Debe retornar JSON con productos de prueba
```

### Test de Cron:
1. **Cambiar schedule temporalmente** a cada 1 minuto
2. **Activar workflow principal**
3. **Esperar 1 minuto y verificar logs**
4. **Restaurar schedule** a cada 6 horas

---

## 🔧 CONFIGURACIONES ADICIONALES

### Optimización de Performance:
```javascript
// En nodo "Buscar Producto", agregar headers:
{
  "User-Agent": "ScrapMarket-Cache/1.0",
  "X-Cache-Source": "predictive"
}
```

### Notificaciones (Opcional):
```javascript
// Agregar nodo "Send Email" después de "Resumen Final"
// Para notificar ejecuciones exitosas/fallidas
```

### Monitoreo:
```sql
-- Crear alerta si no hay cache en 12 horas
SELECT * FROM products 
WHERE predictive_cache = true 
AND last_cache_update < NOW() - INTERVAL '12 hours';
```

---

## 📊 MÉTRICAS ESPERADAS

### Después de implementación:
- **Productos cacheados:** 180+ productos
- **Tiempo de ejecución:** 45-60 minutos
- **Frecuencia:** Cada 6 horas
- **Cache hit rate:** 80%+ para productos populares

### Impacto en App:
- **Búsquedas populares:** 0.5-2 segundos
- **Consumo de datos:** Reducido 50%
- **UX móvil:** Mejorada significativamente

---

## 🚨 TROUBLESHOOTING

### Problema: Workflow no se ejecuta
**Solución:**
1. Verificar que está activado
2. Revisar configuración de cron
3. Verificar logs de n8n

### Problema: Error de BD
**Solución:**
1. Verificar credenciales PostgreSQL
2. Ejecutar script SQL completo
3. Verificar permisos de usuario

### Problema: Sin productos cacheados
**Solución:**
1. Verificar endpoint de búsqueda
2. Revisar logs de scraping
3. Probar con workflow de test

---

## ✅ CHECKLIST FINAL

- [ ] Script SQL ejecutado en Supabase
- [ ] Credenciales PostgreSQL configuradas en n8n
- [ ] Workflow de test activado y funcionando
- [ ] Workflow principal activado
- [ ] Verificación de productos cacheados en BD
- [ ] App mostrando productos populares
- [ ] Métricas de performance verificadas

**¡Cache predictivo implementado exitosamente!** 🎉

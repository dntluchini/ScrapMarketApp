# Cache Predictivo - Flujo n8n

## Objetivo
Mantener actualizados automáticamente los productos más buscados cada 6 horas para reducir tiempo de respuesta de búsquedas populares.

## Productos Populares a Cachear
- Coca Cola (todas las variantes)
- Leche (entera, descremada)
- Pan (blanco, integral)
- Huevos (pack x12, x6)
- Arroz (1kg, 500g)
- Aceite de cocina
- Azúcar
- Harina
- Pasta (fideos, tallarines)

## Estructura del Flujo n8n

### 1. Trigger: Cron (Cada 6 horas)
```
Schedule: 0 */6 * * * (cada 6 horas)
```

### 2. Loop sobre Productos Populares
```
Productos a buscar:
- "coca cola"
- "leche entera"
- "leche descremada" 
- "pan blanco"
- "pan integral"
- "huevos"
- "arroz"
- "aceite"
- "azucar"
- "harina"
- "pasta"
```

### 3. Para cada producto:
- Llamar al endpoint de scraping principal
- Esperar 30 segundos entre productos
- Guardar resultados en BD con flag `predictive_cache: true`
- Actualizar timestamp de último cache

### 4. Notificación de Completado
- Enviar resumen de productos cacheados
- Log de errores si los hay

## Endpoint del Flujo
```
POST /webhook/cache-predictive
```

## Parámetros
```json
{
  "products": [
    "coca cola",
    "leche entera", 
    "leche descremada",
    "pan blanco",
    "pan integral",
    "huevos",
    "arroz",
    "aceite",
    "azucar", 
    "harina",
    "pasta"
  ],
  "maxProductsPerSearch": 20,
  "delayBetweenSearches": 30000
}
```

## Respuesta
```json
{
  "status": "completed",
  "totalProducts": 180,
  "cachedProducts": [
    {
      "query": "coca cola",
      "productsFound": 15,
      "cacheTime": "2024-01-15T10:00:00Z"
    }
  ],
  "errors": [],
  "executionTime": "45m 30s"
}
```

## Configuración en BD
Agregar columna `predictive_cache` a tabla `products`:
```sql
ALTER TABLE products ADD COLUMN predictive_cache BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN last_cache_update TIMESTAMP;
```

## Integración con Frontend
- Mostrar productos populares en home screen
- Indicar "Datos de hace X horas" para productos cacheados
- Priorizar productos cacheados en búsquedas




\n## Lista extendida de productos prioritarios\nEstos t�rminos se utilizan para la nueva heur�stica de relevancia del nodo *scrap-or-not* y el flujo predictivo.\n\n- coca cola
- pan lactal
- leche la serenisima
- agua villavicencio
- aceite natura
- arroz gallo oro
- fideos matarazzo
- azucar ledesma
- harina pureza
- huevos
- queso cremoso
- yogurt ser
- manteca la paulina
- galletas oreo
- cafe cabrales
- te taragui
- jugo cepita
- gaseosa sprite
- cerveza quilmes
- vino toro
- pollo
- carne picada
- pescado
- tomate
- cebolla
- papa
- zanahoria
- lechuga
- banana
- manzana
- naranja
- limon
- pera
- durazno
- uva
- frutilla
- kiwi
- anana
- mango
- palta
- pomelo
- mandarina
- ciruela
- cereza
- sandia
- melon
- dulce de leche
- mermelada
- miel
- sal
- pimienta
- condimentos
- salsa de tomate
- mayonesa hellmanns
- mostaza
- ketchup
- aceitunas
- pickles
- atun
- sardinas
- arvejas
- choclo
- tomate perita
- pan
- facturas
- nuez
- almendra
- avellana
- pistacho
- mani
- girasol
- chia
- quinoa
- avena
- trigo
- cebada
- centeno
- maiz
- soja
- lentejas
- garbanzos
- porotos
- habas
- papas fritas
- chicles
- caramelos
- chocolate
- helado
- crema
- margarina


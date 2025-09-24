# ScrapMarket App

[![Version](https://img.shields.io/badge/version-v1.2.0--beta-blue.svg)](https://github.com/dntluchini/ScrapMarketApp)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Status](https://img.shields.io/badge/status-Active%20Development-brightgreen.svg)](#roadmap)

ScrapMarket App es una aplicación móvil multiplataforma que compara precios entre supermercados VTEX (Carrefour, Jumbo, Disco, Vea). Combina búsqueda en base de datos, scraping bajo demanda y un sistema de cache predictivo para entregar resultados relevantes en segundos.

---

## Qué ofrece

- Búsqueda en tiempo real con fallback a scraping cuando faltan resultados.
- Agrupación inteligente por `EAN / marca / peso` y comparación de precios por supermercado.
- Rotación semántica de productos populares y cache predictivo automatizado con n8n.
- UX optimizada para móviles: skeleton loading, data saver mode, pull-to-refresh.
- Validación de datos con Zod, logging estructurado y Error Boundaries.

Más detalles técnicos (servicios, flujos y agentes) se documentan en [`context.json`](../context.json) y en la carpeta [`docs/`](docs/).

---

## Arquitectura resumida

| Capa | Tecnologías | Comentarios |
| --- | --- | --- |
| **Frontend** | React Native (Expo), TypeScript, React Navigation, AsyncStorage | Aplicación móvil, separación por `screens`, `components`, `services`. |
| **Automatización** | n8n (Docker), VTEX API, Supabase webhooks | Workflows `search`, `prices`, `alerts`, `history`, `predictive cache`. |
| **Datos** | Supabase (PostgreSQL) | Normalización de productos, RLS planificada, cache predictivo marcado con `predictive_cache`. |
| **Infraestructura** | Desarrollo local + Supabase Cloud | Deployment final pendiente (Railway/VPS evaluado). |

---

## Puesta en marcha rápida

1. **Prerequisitos**: Node 18+, npm, Expo CLI, Docker (para n8n), cuenta Supabase.
2. **Instalación**
   ```bash
   git clone https://github.com/dntluchini/ScrapMarketApp.git
   cd ScrapMarketApp
   npm install
   ```
3. **Configurar entornos**
   ```bash
   cp env.example .env
   # editar credenciales (Supabase, n8n)
   ```
4. **Ejecutar**
   ```bash
   npm start            # Metro bundler
   docker compose up    # n8n si es la primera vez
   ```
   > Para probar en dispositivos usa la IP local: `http://192.168.0.158:5678`.

Scripts útiles:
```bash
npm run test:connection   # prueba Supabase / n8n
npm run test:search       # flujo de búsqueda end-to-end
npx tsc --noEmit          # chequeo TypeScript
```

---

## Workflows clave en n8n

- **`definitive_scraper_complete_optimized`**: orquesta búsqueda en BD + scraping + respuesta unificada.
- **`search_in_db`** y **`add_product_to_db`**: lectura/escritura de productos.
- **`cache_predictivo_productos_populares`**: cron cada 6 h para precalentar búsquedas prioritarias.
- **`user-alert`** (en progreso): creación y mantenimiento de alertas.

Cada workflow está versionado en JSON dentro del repo (`/webhook_*.json`) y descrito con más detalle en [`docs/cache_predictive_workflow.md`](docs/cache_predictive_workflow.md) y [`docs/MCP_SETUP.md`](docs/MCP_SETUP.md).

---

## Roadmap

| Estado | Próximas entregas |
| --- | --- |
| **Alta prioridad** | Redux Toolkit para estado global, sistema de alertas de precios, historial de precios, notificaciones push. |
| **Media prioridad** | Modo offline completo, analytics, API Gateway para desacoplar n8n, pruebas unitarias/integración. |
| **Baja prioridad** | Autenticación, favoritos, comparador de listas, CI/CD, internacionalización. |

Para ver backlog completo y roles de agentes consulta `context.json`.

---

## Documentación & soporte

- Guía de cache predictivo: [`docs/cache_predictive_workflow.md`](docs/cache_predictive_workflow.md)
- Guía de implementación: [`docs/GUIA_IMPLEMENTACION_CACHE.md`](docs/GUIA_IMPLEMENTACION_CACHE.md)
- Setup MCP y automatizaciones: [`docs/MCP_SETUP.md`](docs/MCP_SETUP.md)
- Deployment (pendiente de producción): [`DEPLOYMENT.md`](DEPLOYMENT.md)

**Contacto**: [danteluchini@gmail.com](mailto:danteluchini@gmail.com)

---

> Proyecto en desarrollo activo · v1.2.0-beta

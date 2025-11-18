# ScrapMarket App

[![Version](https://img.shields.io/badge/version-v1.4.0--beta-blue.svg)](https://github.com/dntluchini/ScrapMarketApp)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Status](https://img.shields.io/badge/status-Desarrollo%20Activo-brightgreen.svg)](#-documentación-y-soporte)

ScrapMarket App es una aplicación móvil multiplataforma que compara precios entre supermercados basados en VTEX (Carrefour, Jumbo, Disco, Vea). Combina búsquedas en base de datos, scraping bajo demanda y caché predictivo para entregar resultados relevantes en segundos. Ahora con funcionalidad de carrito de compras integrado para compras sin fricciones.

---

## 🚀 Propuesta de Valor

- ⚡ Búsqueda en tiempo real con fallback automático a scraping cuando la base de datos carece de datos frescos.
- 🧠 Agrupación inteligente por marca, nombre y peso para comparar precios por supermercado.
- 🛒 **Carrito de compras integrado** con redirección directa a sitios web de supermercados con cantidades correctas (incluye envío múltiple por supermercado).
- 🔄 Rotación semántica de productos populares más un caché predictivo programado manejado por n8n.
- 📱 UX mobile-first: skeleton loading, pull-to-refresh, renderizado progresivo, modales personalizados.
- 🎨 **Badge animado del carrito** con efecto bounce y actualizaciones en tiempo real vía patrón observer.
- 🔒 Capa de datos robusta con logging estructurado y controles consistentes de errores en servicios.
- 🧭 Acciones en Home (barra de búsqueda, chips y populares) limpian cualquier query previa, inyectan la nueva y disparan la búsqueda automáticamente en iOS, Android y web.
- 🧺 Modal de productos populares con cantidades por supermercado y botones de “Agregar al carrito” que reutilizan el mismo flujo de `cartService`.

Más detalles técnicos (servicios, agentes, workflows) están en [`context.json`](context.json) y la carpeta [`docs/`](docs/).

---

## 🏛️ Arquitectura General

| Capa | Stack | Notas |
| --- | --- | --- |
| **Frontend** | React Native (Expo), TypeScript, React Navigation, AsyncStorage | Screens/componentes/servicios modularizados; tipado estricto aplicado. |
| **Automatización** | n8n (Docker), APIs Oficiales VTEX, Webhooks Supabase | Workflows que orquestan búsqueda en BD, scraping en vivo, caché predictivo y alertas. |
| **Datos** | Supabase (PostgreSQL) | Tablas de productos normalizadas, marcadores de caché predictivo, políticas RLS futuras. |
| **Infraestructura** | Ambiente de desarrollo local + Supabase Cloud | Hosting de producción en evaluación (Railway / VPS). |

---

## 🔁 Workflows Clave de n8n

- **scrap-or-not**: con una sola query decide (vía JavaScript) si responde desde Supabase o dispara scraping en vivo.
- **add-products-to-db**: normaliza marca/peso/link y persiste productos + precios + supermercados en Supabase.
- **popular-products-cache**: cron cada 48 h que precalcula el carrusel “popular” (ideal para demos sin scraping en vivo).
- **popular-products**: al tocar una tarjeta devuelve precios multi-supermercado y conserva contexto para la pantalla Search.
- **category-search**: ejecuta búsquedas rápidas por categorías (Bebidas, Limpieza, etc.) y devuelve grupos listos para renderizar.

Los exports JSON de cada workflow están en el repositorio (`/webhook_*.json`) y documentados en [`docs/cache_predictive_workflow.md`](docs/cache_predictive_workflow.md) y [`docs/MCP_SETUP.md`](docs/MCP_SETUP.md).

---

## 📚 Documentación y Soporte

- Playbook de caché predictivo: [`docs/cache_predictive_workflow.md`](docs/cache_predictive_workflow.md)
- Guía de implementación: [`docs/GUIA_IMPLEMENTACION_CACHE.md`](docs/GUIA_IMPLEMENTACION_CACHE.md)
- Configuración MCP (Context7 / n8n): [`docs/MCP_SETUP.md`](docs/MCP_SETUP.md)
- Sistema de carrito de compras: [`docs/SHOPPING_CART_SYSTEM.md`](docs/SHOPPING_CART_SYSTEM.md)
- Notas de deployment y entorno: [`DEPLOYMENT.md`](DEPLOYMENT.md)

> ¿Dudas o bugs? Abre un issue en GitHub y describe el flujo n8n o endpoint involucrado para dar seguimiento.

---

## 🎯 Funcionalidades

### Funcionalidad Core
- ✅ Búsqueda de productos en tiempo real con fallback inteligente
- ✅ Comparación de precios entre 4 supermercados principales
- ✅ Agrupación inteligente de productos por nombre/marca/peso
- ✅ Carousel de productos populares con auto-rotación
- ✅ Carrito de compras con agrupación por supermercado
- ✅ Links de compra directa con parámetros de cantidad

### Funcionalidades UX/UI
- ✅ Badge animado del carrito con efecto bounce
- ✅ Modales de confirmación personalizados
- ✅ Pantallas de skeleton loading
- ✅ Funcionalidad pull-to-refresh
- ✅ Renderizado progresivo
- ✅ Error boundaries para robustez

### Funcionalidades Técnicas
- ✅ Patrón observer para reactividad del carrito
- ✅ Custom hooks (useCart)
- ✅ TypeScript en modo estricto
- ✅ React Navigation v7
- ✅ Expo SDK 54

---

## 🛠️ Tecnologías

### Frontend
- **React Native** con Expo SDK 54
- **TypeScript** en modo estricto
- **React Navigation v7** (Bottom Tabs + Stack Navigator)
- **Animated API** para animaciones fluidas

### Backend/Automatización
- **n8n** para workflows y scraping
- **Supabase** (PostgreSQL) para base de datos
- **APIs VTEX** oficiales de supermercados

### Herramientas de Desarrollo
- **Git/GitHub** para control de versiones
- **Docker** para n8n
- **npm** para gestión de paquetes

---

## 📱 Supermercados Soportados

| Supermercado | Integración | Estado |
| --- | --- | --- |
| 🛒 **Vea** | Add to Cart Link | ✅ Activo |
| 🛒 **Jumbo** | Add to Cart Link | ✅ Activo |
| 🛒 **Disco** | Add to Cart Link | ✅ Activo |
| 🛒 **Carrefour** | Add to Cart Link | ✅ Activo |

---

## 🤝 Contribuciones

Actualmente este es un proyecto personal en desarrollo activo. Las contribuciones son bienvenidas una vez que se alcance la versión estable v1.5.0.

Si encuentras un bug o tienes una sugerencia, por favor abre un issue en GitHub.

## 🔄 Actualizaciones Recientes

### v1.4.0-beta (Noviembre 2025)
- ✅ Sistema completo de carrito de compras
- ✅ Badge animado con efecto bounce
- ✅ Integración directa con supermercados
- ✅ Modales personalizados para mejor UX
- ✅ Búsqueda automática desde productos populares
- ✅ Gestión de lifecycle del carousel
- ✅ Capitalización correcta de marcas y productos

### v1.3.0-beta (Octubre 2025)
- ✅ Caché predictivo para productos populares
- ✅ Error boundaries implementados
- ✅ Mejoras en performance de búsqueda
- ✅ Skeleton loading para mejor UX

---

> 💡 **Desarrollo activo** · v1.4.0-beta · 95% cobertura funcional  
> 🚀 **Próxima versión**: v1.5.0 (AsyncStorage, Redux Toolkit, Tests)

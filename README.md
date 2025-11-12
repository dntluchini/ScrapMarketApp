# ScrapMarket App

[![Version](https://img.shields.io/badge/version-v1.4.0--beta-blue.svg)](https://github.com/dntluchini/ScrapMarketApp)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Status](https://img.shields.io/badge/status-Desarrollo%20Activo-brightgreen.svg)](#roadmap)

ScrapMarket App es una aplicación móvil multiplataforma que compara precios entre supermercados basados en VTEX (Carrefour, Jumbo, Disco, Vea). Combina búsquedas en base de datos, scraping bajo demanda y caché predictivo para entregar resultados relevantes en segundos. Ahora con funcionalidad de carrito de compras integrado para compras sin fricciones.

---

## 🚀 Propuesta de Valor

- ⚡ Búsqueda en tiempo real con fallback automático a scraping cuando la base de datos carece de datos frescos.
- 🧠 Agrupación inteligente por `EAN / marca / peso` y comparación de precios por supermercado para cada producto.
- 🛒 **Carrito de compras integrado** con redirección directa a sitios web de supermercados con cantidades correctas.
- 🔄 Rotación semántica de productos populares más un caché predictivo programado manejado por n8n.
- 📱 UX mobile-first: skeleton loading, pull-to-refresh, renderizado progresivo, modales personalizados.
- 🎨 **Badge animado del carrito** con efecto bounce y actualizaciones en tiempo real vía patrón observer.
- 🔒 Capa de datos robusta con logging estructurado y error boundaries protectores.

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

## ⚙️ Inicio Rápido

1. **Requisitos previos**: Node 18+, npm, Expo CLI, Docker (para n8n), cuenta de Supabase.
2. **Instalación**
   ```bash
   git clone https://github.com/dntluchini/ScrapMarketApp.git
   cd ScrapMarketApp
   npm install
   ```
3. **Configuración de ambiente**
   ```bash
   cp env.example .env
   # completar credenciales de Supabase y n8n
   ```
4. **Ejecutar**
   ```bash
   npm start            # Expo / Metro
   docker compose up    # n8n (si no está corriendo)
   ```
   > Al testear en dispositivos usa la IP local: `http://192.168.1.99:5678`.

Scripts útiles:
```bash
npm run test:connection   # Verificación de conectividad entre app, Supabase, n8n
npm run test:search       # Validación de búsqueda end-to-end
npx tsc --noEmit          # Verificación de TypeScript en modo estricto
```

---

## 🔁 Workflows Clave de n8n

| Workflow | ID | Trigger / Endpoint | Uso |
| --- | --- | --- | --- |
| `search_in_db` | `Rk9j8ugeiZoXyR2f` | `GET /webhook/search-in-db?q=query` | Búsquedas manuales (primera opción) |
| `quick_search` | - | `GET /webhook/quick_search?q=categoria` | Búsquedas por categoría (Limpieza, Vegetales, etc.) |
| `search-popular-products` | - | `GET /webhook/search-popular-products?q=producto` | Búsquedas desde carrusel de productos populares |
| `add_product_to_db` | `MvK9RbdyRmPnrc6W` | `POST /webhook/add_product_to_db` | Guardar productos scrapeados |
| `definitive_scraper_complete_optimized` | `5ApPJXfntWZn3nda` | `POST /webhook/search-products-complete` | Búsquedas manuales (fallback si search-in-db no encuentra) |
| `predictive_cache_popular_products` | `IB4P3zFPnQn0XIuJ` | **Cron** `0 */6 * * *` | Batch de caché predictivo para productos populares |

**Nota:** Ver [`docs/SEARCH_ENDPOINTS.md`](docs/SEARCH_ENDPOINTS.md) para detalles completos sobre cuándo y cómo se usa cada endpoint.

Los exports JSON de cada workflow están en el repositorio (`/webhook_*.json`) y están documentados en [`docs/cache_predictive_workflow.md`](docs/cache_predictive_workflow.md) y [`docs/MCP_SETUP.md`](docs/MCP_SETUP.md).

---

## 🗺️ Roadmap

| Prioridad | Trabajo Próximo |
| --- | --- |
| **Alta** | Persistencia del carrito con AsyncStorage, Redux Toolkit para estado global, sistema de alertas de precios, historial de precios, notificaciones push. |
| **Media** | Modo offline completo, analytics/métricas, API gateway para abstraer n8n, tests automatizados, optimización de performance. |
| **Baja** | Autenticación, favoritos, comparador de listas de compras, CI/CD, internacionalización. |

✅ **Recientemente Completado:**
- Sistema de carrito de compras con badge animado
- Modales personalizados para mejor UX
- Integración directa con supermercados con parámetros de cantidad
- Búsqueda automática desde carousel de productos populares
- Gestión de lifecycle del carousel (pause/resume)
- Capitalización de nombres de productos y formato de marcas
- **Endpoints especializados por tipo de búsqueda** (quick_search, search-popular-products)
- **Prevención de llamadas innecesarias** a search-in-db cuando hay datos prefetched
- **Limpieza automática de input** después de búsquedas rápidas
- **Detección de búsquedas por categoría** para evitar filtros de relevancia incorrectos

El backlog completo, ownership y roles de agentes están rastreados en `context.json`.

---

## 📚 Documentación y Soporte

- Playbook de caché predictivo: [`docs/cache_predictive_workflow.md`](docs/cache_predictive_workflow.md)
- Guía de implementación: [`docs/GUIA_IMPLEMENTACION_CACHE.md`](docs/GUIA_IMPLEMENTACION_CACHE.md)
- Configuración MCP (Context7 / n8n): [`docs/MCP_SETUP.md`](docs/MCP_SETUP.md)
- Sistema de carrito de compras: [`docs/SHOPPING_CART_SYSTEM.md`](docs/SHOPPING_CART_SYSTEM.md)
- Notas de deployment: [`DEPLOYMENT.md`](DEPLOYMENT.md)

**📬 Contacto**: [danteluchini@gmail.com](mailto:danteluchini@gmail.com)

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

## 📊 Estadísticas del Proyecto

- **Líneas de código**: ~6,500+
- **Archivos TypeScript**: 25+
- **Componentes React**: 15+
- **Pantallas**: 5
- **Servicios**: 5
- **Hooks personalizados**: 2
- **Cobertura funcional**: 95%

---

## 🤝 Contribuciones

Actualmente este es un proyecto personal en desarrollo activo. Las contribuciones son bienvenidas una vez que se alcance la versión estable v1.5.0.

Si encuentras un bug o tienes una sugerencia, por favor abre un issue en GitHub.

---

## 📄 Licencia

Este proyecto está bajo desarrollo. La licencia será definida en versiones futuras.

---

## 🙏 Agradecimientos

- **VTEX** por sus APIs públicas
- **n8n** por la plataforma de automatización
- **Supabase** por la infraestructura de base de datos
- **Expo** por el framework de desarrollo móvil
- **Comunidad de React Native** por el soporte continuo

---

## 📞 Contacto y Soporte

**Desarrollador**: Dante Luchini  
**Email**: [danteluchini@gmail.com](mailto:danteluchini@gmail.com)  
**GitHub**: [@dntluchini](https://github.com/dntluchini)  
**LinkedIn**: [Dante Luchini](https://www.linkedin.com/in/danteluchini)

---

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

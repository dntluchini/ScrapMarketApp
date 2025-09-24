# ScrapMarket App

[![Version](https://img.shields.io/badge/version-v1.2.0--beta-blue.svg)](https://github.com/dntluchini/ScrapMarketApp)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue.svg)](https://reactnative.dev/)
[![Status](https://img.shields.io/badge/status-Active%20Development-brightgreen.svg)](#roadmap)

ScrapMarket App is a cross-platform mobile application that compares prices across VTEX-based supermarkets (Carrefour, Jumbo, Disco, Vea). It blends database lookups, on-demand scraping, and predictive caching to serve relevant results in seconds.

---

## Value Proposition

- Real-time search with automatic fallback to scraping when the database does not have fresh data.
- Intelligent grouping by `EAN / brand / weight` and supermarket price comparison per product.
- Semantic rotation of popular products plus a scheduled predictive cache powered by n8n.
- Mobile-first UX: skeleton loading, data-saver mode, pull-to-refresh, progressive rendering.
- Robust data layer with Zod validation, structured logging, and guarded error boundaries.

Further technical detail (services, agents, workflows) lives in [`context.json`](../context.json) and the [`docs/`](docs/) folder.

---

## **Architecture Overview**

| Layer | Stack | Notes |
| --- | --- | --- |
| **Frontend** | React Native (Expo), TypeScript, React Navigation, AsyncStorage | Modularised screens/components/services; strict typing enforced. |
| **Automation** | n8n (Docker), VTEX Official APIs, Supabase webhooks | Main workflows handle search orchestration, price fetching, predictive cache, and alerts. |
| **Data** | Supabase (PostgreSQL) | Normalised product tables, predictive cache markers, future RLS policies. |
| **Infrastructure** | Local dev environment + Supabase Cloud | Production hosting under evaluation (Railway / VPS). |

---

## Quick Start

1. **Prerequisites**: Node 18+, npm, Expo CLI, Docker (for n8n), Supabase account.
2. **Install**
   ```bash
   git clone https://github.com/dntluchini/ScrapMarketApp.git
   cd ScrapMarketApp
   npm install
   ```
3. **Environment**
   ```bash
   cp env.example .env
   # fill Supabase and n8n credentials
   ```
4. **Run**
   ```bash
   npm start            # Expo / Metro
   docker compose up    # n8n (if not already running)
   ```
   > When testing on devices use the local IP: `http://192.168.0.158:5678`.

Useful scripts:
```bash
npm run test:connection   # Connectivity check between app, Supabase, n8n
npm run test:search       # End-to-end search validation
npx tsc --noEmit          # TypeScript strict mode check
```

---

## Key n8n Workflows

| Name | ID | Endpoint |
| --- | --- | --- |
| `search_in_db` | `Rk9j8ugeiZoXyR2f` | `/webhook/search-in-db` |
| `add_product_to_db` | `MvK9RbdyRmPnrc6W` | `/webhook/add_product_to_db` |
| `definitive_scraper_complete_optimized` | `5ApPJXfntWZn3nda` | `/webhook/search-products-complete` |
| `predictive_cache_popular_products` | `IB4P3zFPnQn0XIuJ` | Triggered via scheduler (internal) |

JSON exports for each workflow live in the repository (`/webhook_*.json`) and are documented in [`docs/cache_predictive_workflow.md`](docs/cache_predictive_workflow.md) and [`docs/MCP_SETUP.md`](docs/MCP_SETUP.md).

---

## Roadmap

| Priority | Upcoming work |
| --- | --- |
| **High** | Redux Toolkit for global state, price alert system, price history, push notifications. |
| **Medium** | Full offline mode, analytics/metrics, API gateway to abstract n8n, automated tests. |
| **Low** | Authentication, favourites, shopping list comparator, CI/CD, internationalisation. |

The full backlog, ownership and agent roles are tracked in `context.json`.

---

## Documentation & Support

- Predictive cache playbook: [`docs/cache_predictive_workflow.md`](docs/cache_predictive_workflow.md)
- Implementation guide: [`docs/GUIA_IMPLEMENTACION_CACHE.md`](docs/GUIA_IMPLEMENTACION_CACHE.md)
- MCP (Context7 / n8n) setup: [`docs/MCP_SETUP.md`](docs/MCP_SETUP.md)
- Deployment notes: [`DEPLOYMENT.md`](DEPLOYMENT.md)

**Contact**: [danteluchini@gmail.com](mailto:danteluchini@gmail.com)

---

> Active development · v1.2.0-beta

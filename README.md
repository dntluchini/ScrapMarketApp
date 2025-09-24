# ScrapMarket App - Price Comparison Platform

[![Version](https://img.shields.io/badge/version-v1.2.0--beta-blue.svg)](https://github.com/dntluchini/ScrapMarketApp)
[![React Native](https://img.shields.io/badge/React%20Native-0.74-blue.svg)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020.svg)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Status](https://img.shields.io/badge/status-Active%20Development-green.svg)](https://github.com/dntluchini/ScrapMarketApp)

Cross-platform mobile app that compares prices of scraped products from VTEX supermarkets (Carrefour, Jumbo, Disco, Vea) with real-time scraping, predictive caching, and intelligent product rotation.

## 🎯 Objective

Develop a mobile app that consumes data from scraped products database, providing:
- 🔍 **Real-time product search** with live scraping
- 💰 **Comparative price visualization** across multiple supermarkets
- 🎯 **Discount detection** and price alerts
- 📊 **Price history** and trends
- 🚀 **Predictive caching** for popular products
- 📱 **Mobile-optimized UX** with progressive loading

## 🏗️ Architecture

### Frontend
- **React Native** with Expo SDK 54
- **TypeScript** with strict mode for type safety
- **React Navigation** v6 for navigation
- **AsyncStorage** for local caching
- **Zod** for data validation

### Backend
- **n8n** (Docker local) for automation and scraping
- **Supabase** (PostgreSQL) for database
- **VTEX API** for product data (no HTML scraping)
- **Webhooks REST** for custom endpoints

### Infrastructure
- **Development**: Docker local (n8n)
- **Database**: Supabase Cloud
- **Deployment**: Pending (Railway/VPS)

## ✨ Core Features

### ✅ Implemented
- [x] **Real-time product search** with automatic scraping
- [x] **Intelligent product grouping** by EAN/marca/peso
- [x] **Price comparison** across multiple supermarkets
- [x] **Predictive caching system** for popular products
- [x] **Semantic category-based rotation** of popular products
- [x] **Data saver mode** and database-only search
- [x] **Pull-to-refresh** native functionality
- [x] **Progressive loading** with skeleton components
- [x] **Improved relevance algorithm** to avoid irrelevant results
- [x] **Brand capitalization** and product name formatting
- [x] **Pack detection** and product similarity grouping

### 🚧 Advanced Features
- [x] **Structured logging** with different log levels
- [x] **Data validation** with Zod schemas
- [x] **Local cache management** with AsyncStorage
- [x] **Time-based product rotation** (breakfast, lunch, dinner, snacks)
- [x] **Parallel loading** with timeouts for better performance
- [x] **Error boundaries** for graceful error recovery
- [x] **Category icons and colors** for visual identification

### ⏳ Pending
- [ ] **Price alert system**
- [ ] **Price history** and trends
- [ ] **User authentication**
- [ ] **Complete offline mode**
- [ ] **Push notifications**
- [ ] **Redux Toolkit** for global state
- [ ] **Error Boundary** improvements

## 🛠️ Technologies & Tools

### Frontend
- **React Native** - Main framework
- **Expo SDK 54** - Rapid development
- **TypeScript** - Type safety and better DX
- **React Navigation** - Screen navigation
- **AsyncStorage** - Local storage
- **Zod** - Schema validation

### Backend
- **n8n** - Automation and scraping
- **Supabase** - PostgreSQL database
- **VTEX API** - Supermarket APIs
- **Docker** - n8n containerization
- **PostgreSQL** - Database with categories

### Development
- **Context7 MCP** - Real-time documentation
- **Git Flow** - Version control
- **Conventional Commits** - Standardized messages

## 🚀 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
- Docker (for n8n)
- Supabase account

### Installation Steps

1. **Clone the repository:**
```bash
git clone https://github.com/dntluchini/ScrapMarketApp.git
cd ScrapMarketApp
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
# Copy example file
cp env.example .env

# Edit .env with your credentials
```

4. **Configure Supabase:**
   - Create project in Supabase
   - Get URL and anon key
   - Update `app.json` with credentials

5. **Start n8n (Docker):**
```bash
# Start n8n in Docker
docker run -it --rm --name n8n -p 5678:5678 n8nio/n8n
```

6. **Start the application:**
```bash
npm start
```

## ⚙️ Configuration

### Environment Variables

Edit `app.json` with your credentials:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://fuyytpcqjxhoermrngkm.supabase.co",
      "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "n8nUrl": "http://192.168.1.85:5678"
    }
  }
}
```

### n8n Workflows

The app uses 5 active n8n workflows:

1. **definitive_scraper_complete_optimized** - Main search workflow
2. **search_in_db** - Database-only search
3. **add_product_to_db** - Save scraped products
4. **cache_predictivo_productos_populares** - Predictive caching (every 6 hours)
5. **test_cache_predictivo_manual** - Manual testing

### Database Schema

The PostgreSQL database includes:
- **products** table with category columns
- **reg_prices** table for historical prices
- **supermarket** table for store information
- **Optimized indexes** for category and relevance searches

## 📱 Features Overview

### 🔍 Smart Search
- **Real-time scraping** when products not found in database
- **Progressive loading** with partial results
- **Relevance algorithm** to avoid irrelevant results
- **Database-first** approach with fallback to scraping

### 🏷️ Product Categories
- **Semantic categories**: Carnes, Lácteos, Frutas/Verduras, Bebidas, Panadería, Limpieza
- **Time-based rotation**: Different categories for breakfast, lunch, dinner, snacks
- **Visual indicators**: Icons and colors for each category
- **Smart filtering**: Avoid irrelevant products (e.g., "pollo" showing dog food)

### 💾 Caching System
- **Predictive caching** for popular products every 6 hours
- **Local cache** with AsyncStorage and configurable TTL
- **Progressive updates** showing loading progress
- **Data saver mode** to reduce API calls

### 🎨 User Experience
- **Skeleton loading** for better perceived performance
- **Pull-to-refresh** native functionality
- **Progressive loading** with immediate UI updates
- **Error boundaries** for graceful error recovery
- **Mobile-first design** with optimized performance

## 📁 Project Structure

```
ScrapMarketApp/
├── src/
│   ├── components/          # Reusable components
│   │   ├── PopularProducts.tsx    # Popular products with rotation
│   │   ├── GroupedProductCard.tsx # Product display cards
│   │   ├── ProductSkeleton.tsx    # Loading skeletons
│   │   ├── ProgressIndicator.tsx  # Loading indicators
│   │   └── ProductCard/           # Product card components
│   ├── screens/             # App screens
│   │   ├── SearchScreen.tsx       # Main search interface
│   │   ├── HomeScreen.tsx         # Home with popular products
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── searchService.ts       # Main search service
│   │   ├── productGroupingService.ts # Product grouping
│   │   └── n8nMcpService.ts       # n8n communication
│   ├── config/              # Configuration
│   │   └── environment.ts         # Environment settings
│   ├── utils/               # Utilities
│   │   ├── logger.ts              # Structured logging
│   │   ├── validation.ts          # Zod validation
│   │   ├── cache.ts               # Cache management
│   │   └── productNameUtils.ts    # Product utilities
│   ├── types/               # TypeScript interfaces
│   └── hooks/               # Custom React hooks
├── docs/                    # Technical documentation
│   ├── cache_predictive_workflow.md
│   ├── GUIA_IMPLEMENTACION_CACHE.md
│   ├── setup_predictive_cache_db.sql
│   └── MCP_SETUP.md
├── assets/                  # Images and resources
└── context.json            # Project context for AI agents
```

## 🔄 Development Flow

### Git Flow
- `main` - Production branch
- `develop` - Development branch
- `feature/name` - New features
- `hotfix/name` - Urgent fixes

### Commit Convention
```
type(scope): description

feat(search): implement product search
fix(auth): fix login validation
docs(readme): update documentation
```

### Recent Commits
- `feat: implement predictive caching system and popular products rotation`
- `feat: add data saver mode and database-only search`
- `feat: implement progressive loading and pull-to-refresh`
- `feat: improve relevance algorithm and semantic categories`
- `fix: resolve TypeScript errors and implicit types`
- `docs: update context.json with complete project state`

## 🧪 Testing

```bash
# Test TypeScript compilation
npx tsc --noEmit

# Test Supabase connection
npm run test:connection

# Test product search
npm run test:search
```

## 🚀 Deployment

### Development
```bash
npm start
```
**Important**: Use local IP (`192.168.1.85`) instead of localhost for mobile device access.

### Production
```bash
# Build for Android
npm run build:android

# Build for iOS
npm run build:ios
```

### Environment Configuration
- **Development**: `http://192.168.1.85:5678/webhook`
- **Staging**: `https://staging-your-vps.com/webhook`
- **Production**: `https://api-your-domain.com/webhook`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 📊 Project Statistics

- **~5000 lines** of code
- **25+ TypeScript** files
- **15+ React** components
- **5+ services**
- **5 active n8n** workflows
- **85% core features** implemented
- **2+ months** of active development

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'feat: add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

### Development Guidelines
- Follow TypeScript strict mode
- Use conventional commits
- Maintain mobile-first design
- Prioritize performance and UX
- Document new features

## 📚 Documentation

- [Technical Documentation](./docs/)
- [Cache Predictive Workflow](./docs/cache_predictive_workflow.md)
- [Implementation Guide](./docs/GUIA_IMPLEMENTACION_CACHE.md)
- [MCP Setup](./docs/MCP_SETUP.md)
- [Deployment Guide](./DEPLOYMENT.md)

## 🔒 Security

- **No hardcoded secrets** in code or workflows
- **RLS (Row Level Security)** in Supabase
- **Input validation** with Zod schemas
- **Error boundaries** for graceful failures
- **Secure API endpoints** with proper authentication

## 📄 License

This project is private and under development.

## 👨‍💻 Author

**Dante** - [danteluchini@gmail.com](mailto:danteluchini@gmail.com)

## 🆘 Support

If you have problems or questions:
- Open an issue on GitHub
- Contact the developer
- Check the documentation in `/docs`

## 🎯 Next Steps

### High Priority
- [ ] Implement Redux Toolkit for global state
- [ ] Create Error Boundary for error handling
- [ ] Implement price alert system
- [ ] Create price history feature
- [ ] Implement push notifications

### Medium Priority
- [ ] Create API Gateway to abstract n8n
- [ ] Implement complete offline mode
- [ ] Add Analytics and metrics
- [ ] Create unit and integration tests
- [ ] Optimize performance for older devices

### Low Priority
- [ ] Implement user authentication
- [ ] Add favorites system
- [ ] Create shopping list comparator
- [ ] Implement CI/CD
- [ ] Add internationalization

---

**Project Status:** 🚧 Active Development - v1.2.0-beta

**Last Updated:** January 2025

**Ready for AI Agent Collaboration** 🤖
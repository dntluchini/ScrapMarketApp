# ScrapMarket App

Cross-platform mobile app to compare prices of scraped products from VTEX supermarkets (Carrefour, Jumbo, Disco, Vea).

## 🎯 Objective

Develop a mobile app that consumes data from a scraped products database, allowing:
- 🔍 Product search
- 💰 Comparative price visualization
- 📊 Discount detection
- 🔔 Price alert configuration
- 📈 Price history

## 🏗️ Architecture

### Frontend
- **React Native** with Expo
- **TypeScript** for static typing
- **React Navigation** for navigation
- **Supabase** for authentication and data

### Backend
- **Supabase** (PostgreSQL)
- **n8n** for scraping and REST endpoints
- **Docker** for local development

### Available Endpoints
- `GET /products?q=term` - Product search
- `GET /products-per-market?canonname=term` - Prices per market
- `POST /alerts` - Create user alerts
- `GET /producto/:canonid/historial` - Price history

## 🚀 Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI
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

5. **Start the application:**
```bash
npm start
```

## 🔧 Configuration

### Environment Variables

Edit `app.json` with your credentials:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "https://your-project.supabase.co",
      "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "apiBaseUrl": "http://localhost:5678/webhook"
    }
  }
}
```

### Environments

- **Development:** Local n8n in Docker (localhost:5678)
- **Staging:** Test VPS
- **Production:** Final VPS

## 📱 Features

### ✅ Implemented
- [x] React Native project configuration
- [x] Supabase integration
- [x] Environment configuration system
- [x] n8n endpoints client
- [x] TypeScript types and interfaces

### 🚧 In Development
- [ ] Screen navigation
- [ ] Product search screen
- [ ] Product details screen
- [ ] Alert system
- [ ] User authentication
- [ ] Offline support

## 🗂️ Project Structure

```
ScrapMarketApp/
├── src/
│   ├── components/          # Reusable components
│   ├── screens/            # App screens
│   ├── config/             # Environment configuration
│   ├── lib/                # Utilities and clients
│   ├── types/              # TypeScript types
│   └── hooks/              # Custom React hooks
├── assets/                 # Images and resources
└── .github/               # GitHub configuration
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

## 🧪 Testing

```bash
# Test Supabase connection
npm run test:connection

# Test product search
npm run test:search
```

## 📦 Deploy

### Development
```bash
npm start
```

### Production
```bash
# Build for Android
npm run build:android

# Build for iOS
npm run build:ios
```

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -m 'feat: add new feature'`)
4. Push to branch (`git push origin feature/new-feature`)
5. Create Pull Request

## 📄 License

This project is private and under development.

## 👨‍💻 Author

**Dante** - [danteluchini@gmail.com](mailto:danteluchini@gmail.com)

## 📞 Support

If you have problems or questions:
- Open an issue on GitHub
- Contact the developer

---

**Project Status:** 🚧 Active development

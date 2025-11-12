# Deployment Guide - ScrapMarket App

**Version:** v1.4.0-beta  
**Last Updated:** November 12, 2025

---

## 🚀 Environment Configuration

### Development (Local)
- **API URL**: `http://192.168.1.99:5678/webhook/`
- **Note**: Use local IP instead of localhost for mobile device access
- **n8n**: Running locally in Docker
- **Current IP**: `192.168.1.99`

**Endpoints activos:**
- `POST /webhook/search-products-complete` - Búsqueda con scraping
- `GET/POST /webhook/search-in-db` - Búsqueda directa en DB
- `POST /webhook/add_product_to_db` - Agregar producto a DB

### Staging (VPS)
- **API URL**: `https://staging-your-vps.com/webhook/`
- **Note**: Update with your actual VPS domain
- **n8n**: Deployed on VPS

### Production (VPS)
- **API URL**: `https://api-your-domain.com/webhook/`
- **Note**: Update with your production domain
- **n8n**: Deployed on production VPS

---

## 📱 Mobile App Configuration

### Key Points for Mobile Development:
1. **Never use `localhost`** - Mobile devices can't access localhost
2. **Use local IP** - Get your machine's IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. **Update environment.ts** - Change `N8N_BASE_URL` in development config
4. **Restart Expo** - After changing environment variables

### Current Configuration:
**File:** `src/config/environment.ts`

```typescript
const development = {
  N8N_BASE_URL: 'http://192.168.1.99:5678',
  SUPABASE_URL: 'https://your-project.supabase.co',
  SUPABASE_ANON_KEY: 'your-anon-key',
};
```

### New Features (v1.4.0):
- ✅ Shopping cart system with reactive updates
- ✅ Direct supermarket integration via addToCartLink
- ✅ Animated cart badge with bounce effect
- ✅ Custom confirmation modals
- ✅ Product name capitalization
- ✅ Carousel lifecycle management

---

## 🔧 n8n Configuration

### Active Workflows:

| Workflow | ID | Method | Endpoint |
|----------|----|----|----------|
| Search Complete | `5ApPJXfntWZn3nda` | POST | `/webhook/search-products-complete` |
| Search in DB | `Rk9j8ugeiZoXyR2f` | GET/POST | `/webhook/search-in-db` |
| Add Product | `MvK9RbdyRmPnrc6W` | POST | `/webhook/add_product_to_db` |
| Popular Products | `IB4P3zFPnQn0XIuJ` | CRON | Every 6 hours |

### Database Requirements:

**Tables:**
- `products` - Main product catalog
- `reg_prices` - Price history with seller info
- `popular_products` - Predictive cache
- `supermarket` - Supermarket metadata

**Critical Fields in `reg_prices`:**
- `seller_id` (INTEGER) - VTEX seller ID
- `seller_name` (VARCHAR) - Supermarket name
- `add_to_cart_link` (TEXT) - Direct add-to-cart URL with SKU, price, seller params

**Example `add_to_cart_link`:**
```
https://www.vea.com.ar/checkout/cart/add?sku=SKU&qty=1&seller=1&sc=34&price=PRICE&cv=_&sc=34
```

### CORS Configuration:
Ensure n8n allows CORS requests from your mobile app domain.

---

## 📋 Deployment Checklist

### Before Deploying to Staging/Production:

#### 1. **Update API URLs**
   - [ ] Change `N8N_BASE_URL` in `src/config/environment.ts`
   - [ ] Update `SUPABASE_URL` and `SUPABASE_ANON_KEY`
   - [ ] Test API connectivity with `npm run test:connection`
   - [ ] Verify n8n is accessible from target environment

#### 2. **Database Configuration**
   - [ ] Verify `reg_prices` table has `seller_name` and `add_to_cart_link` columns
   - [ ] Check `popular_products` table is populated (run CRON manually)
   - [ ] Validate seller data in `supermarket` table
   - [ ] Run data migration scripts if needed
   - [ ] Backup database before major changes

#### 3. **n8n Deployment**
   - [ ] Deploy n8n to VPS (Docker recommended)
   - [ ] Import all workflow JSON files from `/n8n-code/`
   - [ ] Activate critical workflows:
     - Search Complete
     - Search in DB
     - Add Product
     - Popular Products (CRON)
   - [ ] Configure CRON schedule for popular products (every 6 hours)
   - [ ] Test all webhook endpoints with Postman/curl
   - [ ] Configure CORS headers if needed
   - [ ] Set up SSL certificate (Let's Encrypt recommended)

#### 4. **Mobile App Testing**
   - [ ] Update environment configuration for target environment
   - [ ] Build app with `expo build` or `eas build`
   - [ ] Test on physical device (iOS + Android)
   - [ ] Verify search functionality (with and without scraping)
   - [ ] **Test shopping cart functionality** (see dedicated section below)
   - [ ] **Verify addToCartLink redirection works for all supermarkets**
   - [ ] **Test animated badge updates in real-time**
   - [ ] Test popular products carousel and auto-search
   - [ ] Verify error boundaries catch and display errors
   - [ ] Test pull-to-refresh functionality
   - [ ] Check skeleton loading states

#### 5. **Shopping Cart System Validation**
   - [ ] Verify all products have `addToCartLink` in database
   - [ ] Test add-to-cart flow for each supermarket:
     - [ ] Vea (`https://www.vea.com.ar/`)
     - [ ] Jumbo (`https://www.jumbo.com.ar/`)
     - [ ] Disco (`https://www.disco.com.ar/`)
     - [ ] Carrefour (`https://www.carrefour.com.ar/`)
   - [ ] Verify quantity updates correctly in URLs (`qty` param)
   - [ ] Test cart grouping by supermarket
   - [ ] Test quantity increment/decrement controls
   - [ ] Verify modals appear correctly (add, remove, clear)
   - [ ] Test badge animation (bounce effect on number only)
   - [ ] Verify cart state persists during navigation
   - [ ] Test cart clearing (by supermarket and all)

#### 6. **Security**
   - [ ] Use HTTPS in staging/production
   - [ ] Configure proper CORS policies
   - [ ] Validate and sanitize all API inputs
   - [ ] Secure environment variables (use `.env` files, never commit)
   - [ ] Test authentication flows (if implemented)
   - [ ] Review and remove all `console.log` statements in production builds
   - [ ] Implement rate limiting on n8n webhooks
   - [ ] Set up monitoring and alerts

#### 7. **Performance**
   - [ ] Test app performance on low-end devices
   - [ ] Verify images load correctly (all formats)
   - [ ] Check memory usage during heavy operations
   - [ ] Test with slow network conditions
   - [ ] Verify carousel animation doesn't drop frames
   - [ ] Check FlatList performance with large datasets

---

## 🛒 Shopping Cart Deployment Notes

### Critical Requirements:

#### 1. Database Schema
Ensure `reg_prices` table includes:
```sql
ALTER TABLE reg_prices 
ADD COLUMN seller_name VARCHAR(255),
ADD COLUMN add_to_cart_link TEXT;
```

Migrate existing data:
```sql
UPDATE reg_prices rp
SET 
  seller_name = s.seller_name,
  add_to_cart_link = p.add_to_cart_link
FROM products p
JOIN supermarket s ON p.seller_id = s.id
WHERE rp.product_id = p.id;
```

#### 2. n8n Workflows
All n8n nodes must:
- Extract `addToCartLink` during scraping
- Map correctly to each supermarket using domain matching
- Save to `reg_prices` table with correct `seller_id`

**Key n8n modifications:**
- `scrap-or-not` node: Extracts and normalizes seller data
- Category search processor: Groups products and assigns correct links
- Popular products processor: Ensures `imageUrl` and `addToCartLink` are correct

#### 3. Mobile App Integration
**Required components:**
- `CartService` (`src/services/cartService.ts`)
- `CartScreen` (`src/screens/CartScreen.tsx`)
- `useCart` hook (`src/hooks/useCart.ts`)
- `AnimatedCartBadge` (`src/components/AnimatedCartBadge.tsx`)

**Integration points:**
- `AppNavigator.tsx` - Cart tab with badge
- `SupermarketItem.tsx` - Add to cart button
- `SearchScreen.tsx` - Correct mapping of `addToCartLink` from API

### URL Parameter Handling:

The app dynamically updates the `qty` parameter before opening supermarket URLs:

```typescript
const updateCartLinkQuantity = (cartLink: string, quantity: number): string => {
  try {
    const url = new URL(cartLink);
    url.searchParams.set('qty', quantity.toString());
    return url.toString();
  } catch (error) {
    // Fallback regex replacement
    return cartLink.replace(/[?&]qty=\d+/, `qty=${quantity}`);
  }
};
```

### Testing Checklist:

#### For each supermarket (Vea, Jumbo, Disco, Carrefour):
1. Search for a product
2. Add to cart from search results
3. Verify badge updates
4. Navigate to cart screen
5. Verify product appears under correct supermarket
6. Update quantity (+ / -)
7. Press "Agregar al carrito"
8. Verify:
   - Opens correct supermarket website
   - URL contains correct `qty` parameter
   - Product is added to supermarket's cart

#### Common issues:
- ❌ All products redirect to Vea → Check `seller_name` and `add_to_cart_link` in `reg_prices`
- ❌ Wrong quantity in cart → Verify URL parsing and `searchParams.set()`
- ❌ Badge not updating → Check `cartService` listeners and `useCart` subscription
- ❌ Modal not appearing → Verify `Modal` component is imported from `react-native`

---

## 🛠 Troubleshooting

### Common Issues:

#### 1. **Network request failed**
- Check if using localhost instead of local IP
- Verify n8n is running and accessible: `curl http://192.168.1.99:5678/health`
- Check firewall settings (Windows Defender, router)
- Ensure mobile device is on same network as dev machine
- Test with browser first: Open `http://192.168.1.99:5678` in mobile browser

#### 2. **CORS errors**
- Ensure n8n allows CORS requests
- Check if using correct domain
- Add CORS headers in n8n settings:
  ```
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, OPTIONS
  ```

#### 3. **API not responding**
- Verify n8n webhook is active (green indicator in n8n UI)
- Check endpoint URL structure
- Test with curl:
  ```bash
  curl -X POST http://192.168.1.99:5678/webhook/search-in-db \
    -H "Content-Type: application/json" \
    -d '{"q":"coca cola"}'
  ```
- Check n8n execution logs for errors

#### 4. **Cart not updating**
- Check browser console for errors
- Verify `cartService.subscribe()` is called in `useCart`
- Check `notifyListeners()` is called after cart operations
- Test with `console.log` in `cartService`:
  ```typescript
  console.log('🛒 Cart updated:', this.cart);
  console.log('📢 Notifying listeners:', this.listeners.length);
  ```

#### 5. **addToCartLink always points to Vea**
- Verify `reg_prices` table has `add_to_cart_link` for all sellers
- Check n8n node extracts seller data correctly:
  ```javascript
  console.log('Seller data:', {
    sellerName: item.sellerName,
    addToCartLink: item.addToCartLink,
    superName: supermarket.name
  });
  ```
- Verify SQL query joins `reg_prices` correctly by `seller_id`

#### 6. **Images not loading**
- Check image URLs in database (use Supabase SQL Editor)
- Verify HTTPS certificates are valid
- Test URL in browser: Some supermarkets block direct image access
- Fallback: Use placeholder if `imageUrl` is invalid

#### 7. **Badge animation laggy**
- Reduce animation duration (currently 600ms)
- Check device performance (test on lower-end device)
- Verify only Text animates, not View
- Disable animations temporarily to isolate issue

#### 8. **Popular products carousel stops**
- Verify `useIsFocused` hook is imported
- Check `startCarouselAnimation` is called when screen regains focus
- Test with `console.log`:
  ```typescript
  console.log('Carousel focused:', isFocused);
  console.log('Carousel data length:', carouselData.length);
  ```

---

## 📝 Notes

### Local IP Management:
- **Current local IP**: `192.168.1.99`
- If your local IP changes, update:
  1. `src/config/environment.ts` → `N8N_BASE_URL`
  2. Restart Expo dev server: `npm start` → `r` (reload)
  3. Restart mobile app

### VPS Deployment:
- Ensure n8n is accessible from external networks
- Configure firewall to allow ports: 5678 (n8n), 443 (HTTPS)
- Use reverse proxy (nginx) for SSL termination
- Set up automatic backups for n8n workflows and database

### SSL Certificates:
- Use HTTPS in production environments
- Let's Encrypt recommended for free SSL
- Certbot for automatic renewal

### Domain Configuration:
- Update DNS settings for production domain
- Point A record to VPS IP
- Configure CNAME for subdomains if needed

### Monitoring:
- Set up error tracking (Sentry recommended)
- Monitor n8n workflow executions
- Track API response times
- Set up alerts for critical failures

### Documentation:
- Keep this file updated with each deployment
- Document any custom configurations
- Track breaking changes in `CHANGELOG.md`
- Update `context.json` after major changes

---

## 📚 Additional Resources

- [Shopping Cart System Documentation](docs/SHOPPING_CART_SYSTEM.md)
- [Predictive Cache Workflow](docs/cache_predictive_workflow.md)
- [n8n MCP Setup](docs/MCP_SETUP.md)
- [Implementation Guide](docs/GUIA_IMPLEMENTACION_CACHE.md)

---

## 📧 Support

**Developer:** Dante Luchini  
**Email:** danteluchini@gmail.com  
**GitHub:** [@dntluchini](https://github.com/dntluchini)

---

> **Last deployment:** November 12, 2025  
> **Environment:** Development (Local)  
> **Version:** v1.4.0-beta

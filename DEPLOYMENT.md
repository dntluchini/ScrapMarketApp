# Deployment Guide - ScrapMarket App

## ðŸš€ Environment Configuration

### Development (Local)
- **API URL**: `http://192.168.0.158:5678/webhook/products?q=`
- **Note**: Use local IP instead of localhost for mobile device access
- **n8n**: Running locally in Docker

### Staging (VPS)
- **API URL**: `https://staging-your-vps.com/webhook/products?q=`
- **Note**: Update with your actual VPS domain
- **n8n**: Deployed on VPS

### Production (VPS)
- **API URL**: `https://api-your-domain.com/webhook/products?q=`
- **Note**: Update with your production domain
- **n8n**: Deployed on production VPS

## ðŸ“± Mobile App Configuration

### Key Points for Mobile Development:
1. **Never use `localhost`** - Mobile devices can't access localhost
2. **Use local IP** - Get your machine's IP with `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
3. **Update app.json** - Change `apiBaseUrl` in the `extra` section
4. **Update environment.ts** - Change default values in development config

### Current Local IP: `192.168.0.158`
```json
{
  "extra": {
    "apiBaseUrl": "http://192.168.0.158:5678/webhook/products?q="
  }
}
```

## ðŸ”§ n8n Configuration

### Endpoint Structure:
- **Base URL**: `http://your-domain:5678/webhook`
- **Products Endpoint**: `/products?q={canonname}`
- **Full URL**: `http://your-domain:5678/webhook/products?q=search_term`

### CORS Configuration:
Ensure n8n allows CORS requests from your mobile app domain.

## ðŸ“‹ Deployment Checklist

### Before Deploying to Staging/Production:

1. **Update API URLs**:
   - [ ] Change `apiBaseUrl` in `app.json`
   - [ ] Update default values in `environment.ts`
   - [ ] Test API connectivity

2. **n8n Deployment**:
   - [ ] Deploy n8n to VPS
   - [ ] Configure webhook endpoints
   - [ ] Test endpoint accessibility
   - [ ] Configure CORS if needed

3. **Mobile App**:
   - [ ] Update environment configuration
   - [ ] Test on physical device
   - [ ] Verify API connectivity
   - [ ] Test search functionality

4. **Security**:
   - [ ] Use HTTPS in production
   - [ ] Configure proper CORS
   - [ ] Validate API endpoints
   - [ ] Test authentication (if implemented)

## ðŸ› Troubleshooting

### Common Issues:

1. **Network request failed**:
   - Check if using localhost instead of local IP
   - Verify n8n is running and accessible
   - Check firewall settings

2. **CORS errors**:
   - Ensure n8n allows CORS requests
   - Check if using correct domain

3. **API not responding**:
   - Verify n8n webhook is active
   - Check endpoint URL structure
   - Test with curl/Postman

## ðŸ“ Notes

- **Local IP changes**: If your local IP changes, update both `app.json` and `environment.ts`
- **VPS deployment**: Ensure n8n is accessible from external networks
- **SSL certificates**: Use HTTPS in production environments
- **Domain configuration**: Update DNS settings for production domain



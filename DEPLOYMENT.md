# Deployment Guide - EQ App

This guide covers multiple deployment options for your Expo app.

## 🚀 Quick Start Options

### Option 1: Web Deployment (Fastest - ~5 minutes)

**Best for**: Quick public access, testing, demos

#### A. Vercel (Recommended for Web)

```bash
# Install Vercel CLI
npm i -g vercel

# Build and deploy
npx expo export:web
vercel --prod
```

**Pros:**
- ✅ Free tier with generous limits
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Custom domain support
- ✅ Zero config needed

**Steps:**
1. `npm install -g vercel`
2. `npx expo export:web`
3. `vercel` (follow prompts)
4. Done! Get URL instantly

#### B. Netlify

```bash
npm install -g netlify-cli
npx expo export:web
netlify deploy --prod --dir web-build
```

#### C. GitHub Pages

```bash
npx expo export:web
# Then push web-build folder to gh-pages branch
```

---

### Option 2: Mobile App Stores (EAS Build)

**Best for**: Native iOS/Android apps

#### Prerequisites

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure
```

#### Build for iOS

```bash
# Build for App Store
eas build --platform ios --profile production

# Or build for TestFlight
eas build --platform ios --profile preview
```

#### Build for Android

```bash
# Build for Google Play Store
eas build --platform android --profile production

# Or build APK for direct install
eas build --platform android --profile preview
```

#### Submit to Stores

```bash
# iOS App Store
eas submit --platform ios

# Google Play Store
eas submit --platform android
```

**Cost:** 
- EAS Build: Free tier (30 builds/month)
- App Store: $99/year (Apple)
- Play Store: $25 one-time (Google)

---

### Option 3: Self-Hosted Web (Full Control)

**Best for**: Custom domains, enterprise, full control

#### A. AWS S3 + CloudFront

```bash
# Build
npx expo export:web

# Upload to S3
aws s3 sync web-build/ s3://your-bucket-name --delete

# Create CloudFront distribution pointing to S3
```

**Cost:** ~$1-5/month for low traffic

#### B. DigitalOcean App Platform

1. Connect GitHub repo
2. Set build command: `npx expo export:web`
3. Set output directory: `web-build`
4. Deploy

**Cost:** $5/month minimum

#### C. Railway / Render

Similar to DigitalOcean - connect repo, auto-deploy.

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Create `.env.production`:

```env
# S3 URLs (if using CloudFront, update these)
EXPO_PUBLIC_S3_BASE_URL=https://your-cloudfront-url.com/applearningfiles

# API endpoints (if you add backend later)
EXPO_PUBLIC_API_URL=https://api.yourapp.com
```

### 2. Update S3 URLs

If using CloudFront, update `src/data/learning-content.ts`:

```typescript
// Change from:
const S3_BASE = 'https://lumi6eq.s3.amazonaws.com/applearningfiles';

// To:
const S3_BASE = process.env.EXPO_PUBLIC_S3_BASE_URL || 'https://your-cdn.com/applearningfiles';
```

### 3. Configure CORS (for S3)

If hosting media on S3, add CORS policy:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```

### 4. App Icons & Splash

Ensure these exist:
- `assets/icon.png` (1024x1024)
- `assets/splash.png` (1284x2778)
- `assets/favicon.png` (48x48)
- `assets/adaptive-icon.png` (1024x1024)

### 5. Update app.json

```json
{
  "expo": {
    "name": "EQ App",
    "slug": "eq-app",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.eqapp"
    },
    "android": {
      "package": "com.yourcompany.eqapp"
    }
  }
}
```

---

## 🎯 Recommended Deployment Strategy

### Phase 1: Web (Week 1)
1. Deploy to Vercel for instant public access
2. Test all features
3. Share with beta users

### Phase 2: Mobile Apps (Week 2-3)
1. Set up EAS Build
2. Build iOS TestFlight version
3. Build Android APK for testing
4. Submit to stores

### Phase 3: Production (Week 4+)
1. Custom domain setup
2. Analytics integration
3. Error tracking (Sentry)
4. Performance monitoring

---

## 🔧 Quick Commands Reference

```bash
# Web build
npx expo export:web

# Preview web locally
npx expo start --web

# EAS Build (iOS)
eas build --platform ios --profile preview

# EAS Build (Android)
eas build --platform android --profile preview

# Check build status
eas build:list

# Update app version
npx expo-cli version:set 1.0.1
```

---

## 📱 App Store Requirements

### iOS App Store
- ✅ Apple Developer Account ($99/year)
- ✅ Privacy policy URL
- ✅ App Store screenshots (required sizes)
- ✅ App description
- ✅ Age rating

### Google Play Store
- ✅ Google Play Developer Account ($25 one-time)
- ✅ Privacy policy URL
- ✅ App screenshots
- ✅ Feature graphic (1024x500)
- ✅ Age rating

---

## 🌐 Custom Domain Setup

### For Vercel:
1. Go to project settings → Domains
2. Add your domain
3. Update DNS records as instructed

### For S3/CloudFront:
1. Create CloudFront distribution
2. Add SSL certificate (AWS Certificate Manager)
3. Point domain to CloudFront
4. Update DNS records

---

## 🔒 Security Checklist

- [ ] Enable HTTPS everywhere
- [ ] Set proper CORS headers
- [ ] Use environment variables for secrets
- [ ] Enable app signing (EAS handles this)
- [ ] Review S3 bucket permissions
- [ ] Set up error monitoring (Sentry)

---

## 📊 Monitoring & Analytics

### Recommended Tools:

1. **Sentry** - Error tracking
   ```bash
   npm install @sentry/react-native
   ```

2. **Expo Analytics** - Built-in analytics
   ```bash
   # Already included in Expo
   ```

3. **Google Analytics** - User behavior
   ```bash
   npm install @react-native-firebase/analytics
   ```

---

## 🆘 Troubleshooting

### Build Fails
- Check `eas.json` configuration
- Review build logs: `eas build:view`
- Ensure all dependencies are compatible

### Web Build Issues
- Clear cache: `npx expo start -c`
- Check Metro bundler logs
- Verify all imports are correct

### S3 Media Not Loading
- Check CORS configuration
- Verify bucket is public or has proper permissions
- Check CloudFront distribution (if using)

---

## 📞 Next Steps

1. **Choose deployment method** (recommend Vercel for web first)
2. **Set up environment variables**
3. **Build and deploy**
4. **Test thoroughly**
5. **Share with users!**

For detailed EAS Build setup, see: https://docs.expo.dev/build/introduction/

# Troubleshooting Guide

## Current Issue: 500 Error on Bundle Load

If you're seeing a 500 error when trying to load the app, follow these steps:

### Step 1: Clear All Caches

```bash
# Stop the current server (Ctrl+C)

# Clear Metro bundler cache
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .metro

# Clear npm cache (optional)
npm cache clean --force
```

### Step 2: Reinstall Dependencies

```bash
rm -rf node_modules
npm install
```

### Step 3: Restart with Clear Cache

```bash
npx expo start --clear
```

## Path Alias Configuration

The app uses `@/` path aliases configured in:
- `babel.config.js` - For Babel transformation
- `metro.config.js` - For Metro bundler resolution
- `tsconfig.json` - For TypeScript type checking

If imports fail, verify:
1. `babel-plugin-module-resolver` is installed
2. Babel config has the module-resolver plugin
3. `react-native-reanimated/plugin` is LAST in the plugins array

## Supabase auth link redirects to localhost

If the **email confirmation link** (or magic link) from Supabase sends users to `http://localhost:...` instead of your real app URL:

1. **Set your app URL in Supabase Dashboard**  
   Go to **Authentication → URL Configuration**:
   - **Site URL**: Set to your production app URL (e.g. `https://appv1-erd1.vercel.app`). This is the default redirect target.
   - **Redirect URLs**: Add your production URL and keep localhost for dev, e.g.  
     `https://appv1-erd1.vercel.app`, `https://appv1-erd1.vercel.app/**`, `http://localhost:8081`, `http://localhost:8081/**`. Supabase only redirects to URLs in this list.

2. **Set `EXPO_PUBLIC_APP_URL` for production**  
   In your `.env` (and in Vercel **Environment Variables** if you deploy there), set:
   ```bash
   EXPO_PUBLIC_APP_URL=https://appv1-erd1.vercel.app
   ```
   The app uses this (and on web, the current origin) when sending the redirect URL to Supabase for sign-up confirmation emails.

3. **Redeploy**  
   After changing env vars, rebuild/redeploy so the app sends the correct redirect URL in sign-up requests.

## Common Issues

### Issue: "Cannot find module '@/...'"

**Solution**: 
1. Verify `babel-plugin-module-resolver` is in `devDependencies`
2. Restart server with `--clear` flag
3. Check that the file exists in `src/` directory

### Issue: 500 Error on Web

**Solution**:
- SQLite doesn't work on web - this is expected
- Database initialization is skipped on web platform
- Auth uses AsyncStorage fallback on web

### Issue: MIME Type Error

**Solution**:
- This usually means there's a compilation error
- Check the terminal for the actual error message
- The 500 response contains JSON with error details
- Look for syntax errors or import issues

### Issue: App logs out when session is over

**Cause**: Supabase Auth uses a short-lived access token (often ~1 hour) and a refresh token. If the app is closed or in the background for a long time, or storage is cleared, the session can be lost. On Pro plans, **Authentication → Settings** can also enforce time-boxed sessions or inactivity timeout.

**What the app does**:
- `persistSession: true` and `autoRefreshToken: true` in the Supabase client keep the session in AsyncStorage and refresh the access token when it expires.
- On app load, if `getSession()` returns no session, the app now clears user state so you see the sign-in screen instead of stale “logged in” state.
- `onAuthStateChange` clears user state whenever the session becomes null (e.g. token refresh failed, or signed out elsewhere).

**If users are logged out too often**:
1. **Supabase Dashboard** → **Authentication** → **Settings**: Check JWT expiry and any “Session timeout” or “Inactivity” settings (Pro).
2. **Storage**: On web, clearing site data removes the session. On native, reinstalling or clearing app data does the same.
3. **Network**: If refresh fails (e.g. offline), the next successful refresh will restore the session; if the app was closed while offline, the user may need to sign in again.
4. The app now **re-validates the session when the app comes to the foreground** (tab focus or app resume), so token refresh is reflected and unexpected logouts are reduced.

### Multiple users / one device

**One session per app instance**: The app uses a single Supabase auth session per browser or app install. So **only one user can be logged in at a time on a given device or browser**. When a second user signs in, they replace the first user's session. To switch users, sign out first, then the other user can sign in. Each **different device** can have its own logged-in user at the same time.

## Verification Steps

1. Check Babel config:
   ```bash
   cat babel.config.js
   ```
   Should show `module-resolver` plugin before `react-native-reanimated/plugin`

2. Check Metro config:
   ```bash
   cat metro.config.js
   ```
   Should have alias configuration

3. Test a simple import:
   Create a test file to verify paths work:
   ```typescript
   // test.ts
   import { Colors } from '@/constants/design-tokens';
   console.log(Colors.primary);
   ```

## Still Having Issues?

1. Check the terminal output for the actual error message
2. The 500 error response usually contains JSON with error details
3. Look for any red error messages in the Metro bundler output
4. Verify all dependencies are installed: `npm list --depth=0`

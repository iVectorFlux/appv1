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

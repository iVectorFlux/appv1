/**
 * Expo app config with env loading.
 * Loads .env so EXPO_PUBLIC_* and extra vars are available in the app.
 */
require('dotenv').config();

const { expo } = require('./app.json');

module.exports = {
  ...expo,
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY,
  },
};

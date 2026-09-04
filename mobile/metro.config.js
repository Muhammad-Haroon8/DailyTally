const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Ensure .ttf and asset extensions are included
config.resolver.assetExts.push('ttf');

module.exports = config;

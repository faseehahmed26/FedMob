const { getDefaultConfig } = require('@expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix asset resolution issues
config.resolver.assetExts.push('png', 'jpg', 'jpeg', 'gif', 'svg');
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;

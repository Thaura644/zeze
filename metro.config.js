const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for additional file types
config.resolver.assetExts.push(
  // Video formats
  'mp4',
  'mov',
  'avi',
  'mkv',
  // Audio formats  
  'wav',
  'mp3',
  'aac',
  'm4a'
);

module.exports = config;
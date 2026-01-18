module.exports = {
  ios: {
    deploymentKey: process.env.CODEPUSH_IOS_DEPLOYMENT_KEY || '',
  },
  android: {
    deploymentKey: process.env.CODEPUSH_ANDROID_DEPLOYMENT_KEY || '',
  },
};
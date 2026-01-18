const { withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

const withAndroidCodePush = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('maven { url "https://dl.bintray.com/appcenter/ms-appcenter" }')) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /allprojects\s*{/,
      `allprojects {
        maven { url "https://dl.bintray.com/appcenter/ms-appcenter" }`
    );

    return config;
  });
};

const withAppCodePush = (config) => {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.contents.includes('apply from: "../../node_modules/react-native-code-push/android/codepush.gradle"')) {
      return config;
    }

    config.modResults.contents = config.modResults.contents.replace(
      /apply plugin: "com.android.application"/,
      `apply plugin: "com.android.application"
apply from: "../../node_modules/react-native-code-push/android/codepush.gradle"`
    );

    return config;
  });
};

module.exports = (config) => {
  config = withAndroidCodePush(config);
  config = withAppCodePush(config);
  return config;
};
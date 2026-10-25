module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo (SDK 52) tu them plugin cua react-native-reanimated
    presets: ["babel-preset-expo"],
  };
};

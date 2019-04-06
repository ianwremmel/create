module.exports = function(api) {
  api.cache(false);

  return {
    comments: false,
    presets: [
      '@babel/preset-typescript',
      [
        '@babel/preset-env',
        {
          targets: {
            node: true,
          },
        },
      ],
    ],
  };
};

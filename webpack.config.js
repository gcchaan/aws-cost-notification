const path = require('path');
const slsw = require('serverless-webpack');

module.exports = {
  entry: slsw.lib.entries,
  devtool: 'source-map',
  target: 'node',
  mode: slsw.lib.webpack.isLocal ? "development" : "production",
  module: {
    rules: [
      {
        test:   /\.ts(x?)$/,
        use: [{loader: 'ts-loader'}],
      },
    ]
  },

  resolve: {
    extensions: [
      '.ts',
      '.js',
      '.json',
    ],
  },

  output: {
    libraryTarget: 'commonjs',
    path:          path.resolve(__dirname, '.built'),
    filename:      '[name].js',
  },
};

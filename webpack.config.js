const slsw = require('serverless-webpack');
const path = require('path');

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  mode: 'production',
  externals: [
    { 'aws-sdk': 'commonjs aws-sdk' },
  ],
  resolve: {
    alias: {
      // This is a workaround for the fact that Webpack prioritises the "module"
      // definition in package.json but deepmerge is imported by the
      // dynamodb-update-expression package as a UMD module.
      deepmerge$: path.resolve(__dirname, 'node_modules/deepmerge/dist/umd.js'),
    },
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
};

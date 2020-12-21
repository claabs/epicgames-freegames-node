const path = require('path');
const webpack = require('webpack');

const config = {
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  entry: './index.ts',
  output: {
    path: path.resolve(__dirname),
    filename: 'index.bundle.js',
  },
  devtool: 'inline-source-map',
  optimization: {
    // minimize: false,
  },
};

module.exports = config;

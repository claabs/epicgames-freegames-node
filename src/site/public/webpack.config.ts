import * as path from 'path';
import * as webpack from 'webpack';

const config: webpack.Configuration = {
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

export default config;

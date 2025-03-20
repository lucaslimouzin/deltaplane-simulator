const path = require('path');
const webpack = require('webpack');

const isProduction = process.env.NODE_ENV === 'production';
const outputPath = isProduction 
  ? '/opt/render/project/src/public/js'
  : path.resolve(__dirname, 'public/js');

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'bundle.js',
    path: outputPath,
  },
  mode: process.env.NODE_ENV || 'development',
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      'window.IS_PRODUCTION': JSON.stringify(isProduction),
      'window.DEFAULT_PORT': JSON.stringify('8000'),
      'window.DEFAULT_HOST': JSON.stringify('0.0.0.0')
    })
  ]
}; 
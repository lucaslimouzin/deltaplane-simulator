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
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      'process.env.PORT': JSON.stringify(process.env.PORT || '8000'),
      'process.env.HOST': JSON.stringify(process.env.HOST || '0.0.0.0'),
      'process.env.IS_PRODUCTION': JSON.stringify(isProduction)
    })
  ]
}; 
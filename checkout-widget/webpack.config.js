const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: './src/sdk/PaymentGateway.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'checkout.js',
    library: 'PaymentGateway',
    libraryTarget: 'window',
    libraryExport: 'default'
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
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
    ],
  },
  plugins: [
    // Copy any static assets if needed
  ],
  mode: 'production'
};

const path = require("path");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/app.ts",
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist")
  },
  devtool: "inline-source-map",
  target: "node",
  node: {
    __dirname: false
  },
  externals: [/node_modules/, "bufferutil", "utf-8-validate"],
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"]
  },
  optimization: {
    minimize: false
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin([
      { from: "src/server.json", to: "server.json" },
      { from: "ecosystem.config.js", to: "ecosystem.config.js" }
    ])
  ]
};

const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");

console.log("executing dist...");
const rootPath = path.resolve(__dirname, "..");
exec("webpack", { cwd: rootPath }, (err, stdout, stderr) => {
  if (err) {
    console.error("error executind dist");
    console.error(stderr);
    return;
  }
  console.log(stdout);

  const distDir = path.resolve(rootPath, "dist/server");

  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }

  const bundlePath = path.resolve(rootPath, "dist/bundle.js");
  const batPath = path.resolve(rootPath, "start.bat");
  const ecosystemPath = path.resolve(rootPath, "ecosystem.config.js");
  const serverJsonPath = path.resolve(rootPath, "src/server.json");

  fs.copyFile(bundlePath, path.resolve(distDir, "bundle.js"), err => {
    if (err) throw err;
  });

  fs.copyFile(batPath, path.resolve(distDir, "start.bat"), err => {
    if (err) throw err;
  });

  fs.copyFile(
    ecosystemPath,
    path.resolve(distDir, "ecosystem.config.js"),
    err => {
      if (err) throw err;
    }
  );

  fs.copyFile(serverJsonPath, path.resolve(distDir, "server.json"), err => {
    if (err) throw err;
  });

  console.error("dist finished");
});

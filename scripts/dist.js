const path = require("path");
const { exec } = require("child_process");
const fs = require("fs");
const zip = new require("node-zip")();

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
  const blacklistPath = path.resolve(rootPath, "src/email-blacklist.txt");

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

  fs.copyFile(
    blacklistPath,
    path.resolve(distDir, "email-blacklist.txt"),
    err => {
      if (err) throw err;
    }
  );

  zip.file("bundle.js", fs.readFileSync(bundlePath));
  zip.file("start.bat", fs.readFileSync(batPath));
  zip.file("ecosystem.config.js", fs.readFileSync(ecosystemPath));
  zip.file("server.json", fs.readFileSync(serverJsonPath));
  zip.file("email-blacklist.txt", fs.readFileSync(blacklistPath));

  const data = zip.generate({ base64: false, compression: "DEFLATE" });

  fs.writeFileSync("server.zip", data, "binary");

  console.error("dist finished");
});

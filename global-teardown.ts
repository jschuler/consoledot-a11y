// global-teardown.ts
const fs = require("fs");
const path = require("path");
const files: string[] = [];
let results = [];

const getFilesRecursively = (directory) => {
  const filesInDirectory = fs.readdirSync(directory);
  for (const file of filesInDirectory) {
    const absolute = path.join(directory, file);
    if (fs.statSync(absolute).isDirectory()) {
      getFilesRecursively(absolute);
    } else {
      files.push(absolute);
    }
  }
};

async function globalTeardown() {
  const axeDir = path.join(__dirname, "/axe");
  getFilesRecursively(axeDir);
  // console.log(files);
  files.forEach((f) => {
    const file = fs.readFileSync(f);
    results.push(JSON.parse(file));
  });
  fs.writeFileSync(
    path.join(__dirname, "/results.json"),
    JSON.stringify(results, null, 2)
  );
}

export default globalTeardown;

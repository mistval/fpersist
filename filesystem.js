const fs = require('fs');
const path = require('path');
const md5 = require('md5');

function getFilePath(persistenceDir, key) {
  return path.join(persistenceDir, md5(key));
}

function unlinkFile(filePath) {
  return new Promise((fulfill, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        return reject(err);
      }

      fulfill();
    });
  });
}

function getPathsInDir(persistenceDir) {
  return new Promise((fulfill, reject) => {
    fs.readdir(persistenceDir, (err, fileNames) => {
      if (err) {
        return reject(err);
      }

      const filePaths = fileNames.map(fileName => path.join(persistenceDir, fileName));
      fulfill(filePaths);
    });
  });
}

async function deleteDirectoryContents(persistenceDir) {
  const filePaths = await getPathsInDir(persistenceDir);
  const promises = filePaths.map(filePath => unlinkFile(filePath));

  return Promise.all(promises);
}

function readData(persistenceDir, key, defaultValue) {
  const filePath = getFilePath(persistenceDir, key);

  return new Promise((fulfill, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
          return fulfill(defaultValue);
        }

        return reject(err);
      }

      fulfill(JSON.parse(data).value);
    });
  });
}

function writeData(persistenceDir, key, data, stringify) {
  const filePath = getFilePath(persistenceDir, key);

  return new Promise((fulfill, reject) => {
    fs.writeFile(filePath, stringify({ key, value: data }), (err) => {
      if (err) {
        return reject(err);
      }

      fulfill();
    });
  });
}

module.exports = {
  deleteDirectoryContents,
  readData,
  writeData,
};

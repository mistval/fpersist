const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex');
}

function getFilePath(persistenceDir, key) {
  return path.join(persistenceDir, md5(key));
}

function unlinkFile(filePath) {
  return new Promise((fulfill, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        return reject(err);
      }

      return fulfill();
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
      return fulfill(filePaths);
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

      try {
        return fulfill(JSON.parse(data).value);
      } catch (innerErr) {
        return reject(innerErr);
      }
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

      return fulfill();
    });
  });
}

function deleteData(persistenceDir, key) {
  const filePath = getFilePath(persistenceDir, key);

  return new Promise((fulfill, reject) => {
    fs.unlink(filePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      }

      fulfill();
    });
  });
}

async function getAllKeys(persistenceDir) {
  const fileNames = await fs.promises.readdir(persistenceDir);
  const readFilePromises = fileNames.map(async (fileName) => {
    const filePath = path.join(persistenceDir, fileName);
    const fileContent = await fs.promises.readFile(filePath);
    const fileContentParsed = JSON.parse(fileContent);
    return fileContentParsed.key;
  });

  return Promise.all(readFilePromises);
}

module.exports = {
  deleteDirectoryContents,
  readData,
  writeData,
  deleteData,
  getAllKeys,
};

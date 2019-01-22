const mkdirp = require('mkdirp');
const fs = require('fs');
const path = require('path');
const md5 = require('md5');

function getFilePath(persistenceDir, key) {
  return path.join(persistenceDir, `${md5(key)}.json`);
}

function readData(persistenceDir, key) {
  const filePath = getFilePath(persistenceDir, key);

  return new Promise((fulfill, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        // If file not found, return undefined
        if (err.code === 'ENOENT') {
          return fulfill();
        }

        return reject(err);
      }

      fulfill(JSON.parse(data));
    });
  });
}

function writeData(persistenceDir, key, data, stringify) {
  const filePath = getFilePath(persistenceDir, key);

  return new Promise((fulfill, reject) => {
    fs.writeFile(filePath, stringify(data), (err) => {
      if (err) {
        return reject(err);
      }

      fulfill();
    });
  });
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

class Storage {
  /**
   * 
   * @param {string} persistenceDir - The directory to persist data to.
   */
  constructor(persistenceDir, stringify = JSON.stringify) {
    this.persistenceDir = persistenceDir;
    this.stringify = stringify;
    this.writeQueueForKey = {};
  }

  async init() {
    await mkdirp(this.persistenceDir);
  }

  async editItem(key, editFunction) {
    if (!this.writeQueueForKey[key]) {
      this.writeQueueForKey[key] = Promise.resolve();
    }

    const promise =  this.writeQueueForKey[key].then(async () => {
      const currentData = await readData(this.persistenceDir, key);
      const newData = await editFunction(currentData);
      await writeData(this.persistenceDir, key, newData, this.stringify);

      if (this.writeQueueForKey[key] === promise) {
        delete this.writeQueueForKey[key];
      }
    });

    this.writeQueueForKey[key] = promise;
    return promise;
  }

  clear() {
    return deleteDirectoryContents(this.persistenceDir);
  }

  getItem(key) {
    return readData(this.persistenceDir, key);
  }
}

module.exports = Storage;

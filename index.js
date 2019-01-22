const mkdirp = require('mkdirp');
const fs = require('fs');
const filenamify = require('filenamify');
const path = require('path');

const writeQueueForKey = {};

function getFilePath(persistenceDir, key) {
  return path.join(persistenceDir, `${filenamify(key)}.json`);
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

class Storage {
  /**
   * 
   * @param {string} persistenceDir - The directory to persist data to.
   */
  constructor(persistenceDir, stringify = JSON.stringify) {
    this.persistenceDir = persistenceDir;
    this.stringify = stringify;
  }

  async init() {
    await mkdirp(this.persistenceDir);
  }

  async editItem(key, editFunction) {
    if (!writeQueueForKey[key]) {
      writeQueueForKey[key] = Promise.resolve();
    }

    const promise =  writeQueueForKey[key].then(async () => {
      const currentData = await readData(this.persistenceDir, key);
      const newData = await editFunction(currentData);
      await writeData(this.persistenceDir, key, newData, this.stringify);

      if (writeQueueForKey[key] === promise) {
        delete writeQueueForKey[key];
      }
    });

    writeQueueForKey[key] = promise;
    return promise;
  }

  getItem(key) {
    return readData(this.persistenceDir, key);
  }
}

module.exports = Storage;

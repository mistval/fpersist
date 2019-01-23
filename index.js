const mkdirp = require('mkdirp');
const filesystem = require('./filesystem.js');

class Storage {
  /**
   * @constructor
   * @param {string} persistenceDir - The directory to persist data to.
   * @param {function} [JSON.stringify] stringify - A function that stringifies a JavaScript object.
   */
  constructor(persistenceDir, stringify = JSON.stringify) {
    this.persistenceDir = persistenceDir;
    this.stringify = stringify;
    this.writeQueueForKey = {};
  }

  /**
   * Initialize persistence.
   * @async
   */
  init() {
    return mkdirp(this.persistenceDir);
  }

  /**
   * Edit the value of a key in the database.
   * @param {string} key - The key to edit the value of.
   * @param {function} editFunction - A function that takes the current value
   *   in the database as an argument, and returns the updated value that should
   *   be stored.
   * @param {Object} [undefined] defaultValue - If the key does not exist in the database,
   *   this value will be passed to the editFunction.
   * @async
   */
  editItem(key, editFunction, defaultValue) {
    if (!this.writeQueueForKey[key]) {
      this.writeQueueForKey[key] = Promise.resolve();
    }

    const promise = this.writeQueueForKey[key].catch(() => {}).then(async () => {
      const currentData = await filesystem.readData(this.persistenceDir, key, defaultValue);
      const newData = await editFunction(currentData);
      await filesystem.writeData(this.persistenceDir, key, newData, this.stringify);

      if (this.writeQueueForKey[key] === promise) {
        delete this.writeQueueForKey[key];
      }
    });

    this.writeQueueForKey[key] = promise;
    return promise;
  }

  /**
   * Delete all files in the persistence directory.
   * ALL files in the persistence directory will be deleted,
   * not only those created by fpersist.
   * @async
   */
  clear() {
    return filesystem.deleteDirectoryContents(this.persistenceDir);
  }

  /**
   * Get the value in the database for a given key.
   * @param {string} key - The key to get the value of.
   * @param {Object} [undefined] defaultValue - If the key
   *   does not exist in the database, this value will be
   *   returned.
   * @async
   */
  getItem(key, defaultValue) {
    return filesystem.readData(this.persistenceDir, key, defaultValue);
  }
}

module.exports = Storage;

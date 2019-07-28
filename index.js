const fs = require('fs');
const filesystem = require('./filesystem.js');

class Storage {
  /**
   * @constructor
   * @param {string} persistenceDir - The directory to persist data to.
   * @param {Object} [options={}] - Optional options.
   * @param {Function} [options.stringify=JSON.stringify] - A function that
   *   takes a JavaScript object as its only parameter and returns a string.
   * @param {boolean} [options.allowUndefinedEdits=false] - Whether to allow editFunctions to
   *   return undefined. Leaving this false helps you avoid accidentally deleting data by
   *   forgetting to return something from an editFunction.
   */
  constructor(persistenceDir, options = {}) {
    this.closed = false;
    this.persistenceDir = persistenceDir;
    this.stringify = options.stringify || JSON.stringify;
    this.allowUndefinedEdits = options.allowUndefinedEdits || false;
    this.queueForKey = {};

    this.madeDir = new Promise((fulfill, reject) => {
      fs.mkdir(this.persistenceDir, { recursive: true }, (err) => {
        if (err) {
          return reject(err);
        }

        return fulfill(err);
      });
    });
  }

  verifyNotClosed() {
    if (this.closed) {
      throw new Error('This FPersist instance has been close()d and cannot accept any more edits.');
    }
  }

  async enqueueForKey(key, action) {
    await this.madeDir;
    this.verifyNotClosed();

    if (!this.queueForKey[key]) {
      this.queueForKey[key] = Promise.resolve();
    }

    const doAction = this.queueForKey[key].then(() => action());
    const promiseForQueue = doAction
      .catch(() => {})
      .then(() => {
        if (this.queueForKey[key] === promiseForQueue) {
          delete this.queueForKey[key];
        }
      });

    this.queueForKey[key] = promiseForQueue;

    return doAction;
  }

  /**
   * Edit the value of a key in the database.
   * @param {string} key - The key to edit the value of.
   * @param {function} editFunction - A function that takes the current value
   *   in the database as an argument, and returns the updated value that should
   *   be stored.
   * @param {*} [defaultValue] - If the key does not exist in the database,
   *   this value will be passed to the editFunction.
   */
  async editItem(key, editFunction, defaultValue) {
    return this.enqueueForKey(key, async () => {
      const currentData = await filesystem.readData(this.persistenceDir, key, defaultValue);
      const newData = await editFunction(currentData);
      if (newData === undefined && !this.allowUndefinedEdits) {
        throw new Error('editFunction returned undefined. Is that a mistake? To disable this error, set options.allowUndefinedEdits to true in the FPersist constructor. To delete data, use deleteData() instead.');
      }

      await filesystem.writeData(this.persistenceDir, key, newData, this.stringify);
      return newData;
    });
  }

  /**
   * Delete the database and start afresh.
   * This will delete all files in the persistence directory.
   * ALL files in the persistence directory will be deleted,
   * not only those created by fpersist.
   */
  async clear() {
    await this.madeDir;
    this.verifyNotClosed();
    return filesystem.deleteDirectoryContents(this.persistenceDir);
  }

  /**
   * Get the value in the database for a given key.
   * @param {string} key - The key to get the value of.
   * @param {*} [defaultValue] - If the key
   *   does not exist in the database, this value will be
   *   returned.
   */
  async getItem(key, defaultValue) {
    return this.enqueueForKey(
      key,
      () => filesystem.readData(this.persistenceDir, key, defaultValue),
    );
  }

  /**
   * Delete the key and its associated value.
   * If the key does not exist in the database,
   * this does nothing and fulfills.
   * @param {string} key - The key to delete.
   */
  async deleteItem(key) {
    return this.enqueueForKey(
      key,
      () => filesystem.deleteData(this.persistenceDir, key),
    );
  }

  /**
   * Tell FPersist to finish queued reads and edits and refuse to accept any more operations.
   * The promise returned by this method will be fulfilled when all pending operations
   * have been performed.
   */
  async close() {
    await this.madeDir;
    this.closed = true;
    const queues = Object.values(this.queueForKey);
    return Promise.all(queues);
  }
}

module.exports = Storage;

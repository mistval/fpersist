const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const Storage = require('./index');

test('Storage can store and retrieve data', async () => {
  const testDir = path.join(__dirname, 'test-data');
  
  try {
    await fs.promises.rmdir(testDir, { recursive: true });
  } catch (err) {
    // Directory doesn't exist, that's fine
  }

  const storage = new Storage(testDir);

  try {
    const testKey = 'test-key';
    const testValue = { name: 'John', age: 30, items: ['apple', 'banana'] };

    const result = await storage.editItem(testKey, (currentValue) => {
      assert.strictEqual(currentValue, undefined);
      return testValue;
    });

    assert.deepStrictEqual(result, testValue);

    const retrievedValue = await storage.getItem(testKey);
    assert.deepStrictEqual(retrievedValue, testValue);

    const updatedValue = { ...testValue, age: 31 };
    const updateResult = await storage.editItem(testKey, (currentValue) => {
      assert.deepStrictEqual(currentValue, testValue);
      return updatedValue;
    });

    assert.deepStrictEqual(updateResult, updatedValue);

    const finalValue = await storage.getItem(testKey);
    assert.deepStrictEqual(finalValue, updatedValue);

  } finally {
    await storage.close();
    try {
      await fs.promises.rmdir(testDir, { recursive: true });
    } catch (err) {
    }
  }
});

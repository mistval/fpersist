# FPersist

Simple key-value on disk persistence with safe, functional writes. WIP

FPersist is inspired by [node-persist](https://www.npmjs.com/package/node-persist) and is intended to solve some shortcomings of node-persist, described more in the **Motivation** section below. If you already have data stored with node-persist, FPersist can use it, just tell FPersist to use your node-persist directory. Likewise, you can go back to node-persist at any time, the on-disk data format is the same.

## API

### `const fpersist = new FPersist(persistenceDirPath, stringify=JSON.stringify)`

Create an instance of FPersist and retrieve/store data from/to the provided directory path. If the path doesn't exist, it will be created. It is safe to instantiate multiple instances of FPersist with the same persistenceDirPath **within the same process**. Ideally, you shouldn't let anything except FPersist use this directory.

You can pass a custom stringify function if you want, but the returned value should be parsable by JSON.parse. If you want human-readable JSON files in your persistenceDirPath, try `str => JSON.stringify(str, null, 2)`.

### `await fpersist.init()`

Initialize fpersist. You must call this before using other methods.

### `await fpersist.clear()`

Clear persistence and start afresh. This deletes ALL files in the persistence directory, including files not created by FPersist.

### `await fpersist.getItem(key, defaultValue=undefined)`

Get the value associated with the given key. If the key doesn't exist in the database, the optional defaultValue will be returned (undefined by default).

```js
const counter = await fpersist.getItem('counter', 0);
```

### `await fpersist.editItem(key, editFunction, defaultValue=undefined)`

Update the value associated with the given key. Your editFunction should take the current value as an argument and return the updated value. If the key is not present in the database, the defaultValue will be passed to your editFunction. Your editFunction can be async. Edits are queued and won't conflict, as demonstrated in the **Motivation** section.

```js
await fpersist.editItem(
  'scores',
  (scores) => {
    scores.johnDoe = scores.johnDoe || 0;
    scores.johnDoe += 1;
    return scores;
  },
  {},
);
```

## Motivation

This is inspired by [node-persist](https://www.npmjs.com/package/node-persist) which I moved away from due to its lack of support for multiple-readers/single-writer locking (the absense of which can potentially lead to database corruption) and functional edits (the absence of which can potentially lead to lost information). This library is meant to improve on that while maintaining a very similar interface.

Consider the following code using node-persist:

```js
const nodePersist = require('node-persist');

async function incrementDbValue() {
  const currentValue = (await nodePersist.getItem('counter')) || 0;
  await nodePersist.setItem('counter', currentValue + 1);
}

async function start() {
  await nodePersist.init();
  await nodePersist.clear();

  const promises = [];
  for (let i = 0; i < 100; i += 1) {
    promises.push(incrementDbValue());
  }

  await Promise.all(promises);
  const finalValue = await nodePersist.getItem('counter');

  console.log(`Expected 100, got ${finalValue}`);
}

start();
```

What I want to happen is that every call to incrementDbValue increments the value in the database by one, so the value in the database should be equal to the number of times the function has been called (100). However, that doesn't happen, the final value is equal to 1 (and technically could be some other indeterminable number less than or equal to 100). What happens is that node-persist reads 0 from storage a hundred times, then increments that 0 to 1 a hundred times, and then stores the 1 a hundred times.

The following code using fpersist's functional edits does not exhibit this problematic behavior. The final value is 100.

```js
const FPersist = require('fpersist');
const path = require('path');
const fpersist = new FPersist(path.join(__dirname, 'fpersist'));

function incrementDbValue() {
  return fpersist.editItem('counter', currentValue => {
    return (currentValue || 0) + 1;
  });
}

async function start() {
  await fpersist.init();
  await fpersist.clear();

  const promises = [];
  for (let i = 0; i < 100; i += 1) {
    promises.push(incrementDbValue());
  }

  await Promise.all(promises);
  const finalValue = await fpersist.getItem('counter');

  console.log(`Expected 100, got ${finalValue}`);
}

start();
```

## About

If you find a bug or want to suggest additions (synchronous methods, etc), please feel free to open an issue on the Github repo.

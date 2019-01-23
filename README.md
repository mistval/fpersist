# fpersist

Simple key-value on disk persistence with safe, functional writes. WIP

## Motivation

This is inspired by [node-persist](https://www.npmjs.com/package/node-persist) which I moved away from due to its lack of support for multiple-readers/single-writer locking (the absense of which can potentially lead to database corruption) and functional edits. This library is meant to improve on that while maintaining a very similar interface.

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

The following code using fpersist's functional edits does not exhibit this problematic behavior. The final value is 100, as expected.

```js
const FPersist = require('fpersist');
const path = require('path');
const persistence = new FPersist(path.join(__dirname, 'persistence'));

function incrementDbValue() {
  return persistence.editItem('counter', currentValue => {
    return (currentValue || 0) + 1;
  });
}

async function start() {
  await persistence.init();
  await persistence.clear();

  const promises = [];
  for (let i = 0; i < 100; i += 1) {
    promises.push(incrementDbValue());
  }

  await Promise.all(promises);
  const finalValue = await persistence.getItem('counter');

  console.log(`Expected 100, got ${finalValue}`);
}

start();
```

## API

### `const fpersist = new FPersist(persistenceDirPath, stringify=JSON.stringify)`

Create an instance of FPersist and retrieve/store data from/to the provided directory path. If the path doesn't exist, it will be created. It is safe to instantiate multiple instances of FPersist with the same persistenceDirPath **within the same process**. Ideally, you shouldn't let anything except FPersist use this directory.

You can pass a custom stringify function if you want, but the returned value should be parsable by JSON.parse. If you want human-readable JSON files in your persistenceDirPath, try `str => JSON.stringify(str, null, 2)`.

### `await fpersist.init()`

Initialize fpersist. You must call this before user other methods.

### `await fpersist.clear()`

Clear persistence and start fresh. This deletes ALL files in the persistence directory, including files not created by FPersist.

### `await fpersist.getItem(key, defaultValue)`

Get the value associated with the given key. If the key doesn't exist in the database, the optional defaultValue will be returned (undefined by default).

```js
const counter = await fpersist.getItem('counter', 0);
```

### `await fpersist.editItem(key, editFunction, defaultValue=undefined)`

Update the value associated with the given key. Your edit function should take the current value as an argument and return the updated value. If the key is not present in the database, the defaultValue will be passed to your editFunction. Your edit function can be async. Edits are queued and won't conflict, as demonstrated in the **Motivation** section.

```js
await fpersist.editItem(
  'scores',
  (scores) => {
    scores.johnDoe += 1;
    return scores;
  },
  {},
);
```

## About

If you find a bug or want to suggest additions (synchronous methods, etc), please feel free to open an issue on the Github repo.

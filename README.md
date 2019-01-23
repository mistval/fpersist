# fpersist

Simple on disk persistence with safe, functional writes. WIP

## Motivation

This is inspired by [node-persist](https://www.npmjs.com/package/node-persist) which I moved away from due to its lack of support for multiple-readers/single-writer locking (the absense of which can potentially lead to database corruption) and functional edits. This library is meant to improve on that.

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

What I want to happen is that every call to incrementDbValue increments the value in the database by one, so the value in the database should be equal to the number of times the function has been called (100). However, that doesn't happen, the final value is equal to 1. What happens is the code reads 0 from storage a hundred times, then increments that 0 to 1 a hundred times, and then stores the 1 a hundred times.

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

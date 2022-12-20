# PostCSS Colorguard

Every CSS project starts out with good intentions, but inevitably, one too many people eye-dropper
colors into nooks and crannies that you never knew existed. CSS Colorguard Upgraded helps you maintain the
color set that you want, and warns you when colors you've added are too similar to ones that already
exist. Naturally, it's all configurable to your tastes.

## How it works

Colorguard uses the [CIEDE2000](http://en.wikipedia.org/wiki/Color_difference#CIEDE2000) algorithm to determine
the similarity of each of the colors in your CSS file. This algorithm is quite complex, but is used
in the broadcasting community as the best approximation of human ability to discern differences in
color. RGB on the other hand, is pretty bad at representing differences in color purely based on the
numerical difference of the hex values.

## Plugin

See the
[documentation](https://github.com/postcss/postcss#usage) for examples for
your environment.

### CJS

```js
const colorguard = require('postcss-colorguard');
postcss([colorguard(opts)]);
```

### ESM

```js
import colorguard from 'postcss-colorguard';
postcss([colorguard(opts)]);
```

## options

### ignore

Type: `array`

Specify colors that you would like to ignore completely.
Use with caution.

```js
[['black', '#010101', 'rgba(0,0,0,1)']];
```

### whitelist

Type: `array`

Pass an array of color pairs to ignore:

```js
[['#000000', 'rgba(0,0,0,1)']];
```

### threshold

Type: `number`
Default: `3`

`0` through `100`. Lower values are more precise; the default is `3` but that's
mostly personal opinion.

### allowEquivalentNotation

Type: `boolean`
Default: `false`

By default, colorguard will complain if identical colors are represented with different notations.
For example, `#000`, `#000000`, `rgba(0, 0, 0, 0)`, and `black`. If you want to permit these
equivalent notations, set this option to `true`.

## Install

```bash
npm install postcss-colorguard postcss
yarn add postcss-colorguard postcss
```

## Thanks

- [@SlexAxton](https://github.com/SlexAxton) - Created `css-colorguard`

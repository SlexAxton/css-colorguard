# Colorguard Cli

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

## CLI

To see the available options, just run:

```bash
 colorguard --help
```

## Install

```bash
npx colorguard-cli
yarn dlx colorguard-cli
```

## Thanks

- [@SlexAxton](https://github.com/SlexAxton) - Created `css-colorguard`

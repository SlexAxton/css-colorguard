#!/usr/bin/env node
import yargs from 'yargs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { processor } from 'colorguard-processor';
import type { Root } from 'postcss';
import type { Options } from '../../../types/global';
const { argv: _argv, describe, showHelp } = yargs;
const stdin = process.stdin;
const argv = _argv;

describe('file', 'A CSS file')
  .describe('threshold', 'Threshold of allowable color difference')
  .describe(
    'allow-equivalent-notation',
    'Allow equivalent notation of the same color, e.g. #000 and #000000'
  )
  .describe(
    'options',
    'An optional JSON file containing all options (Overrides `--threshold`)'
  )
  .usage('Usage: colorguard --file [style.css] ');

process.title = 'colorguard';

let css: string | { toString(): string } | Root = [];
let options: Options = {};

// @ts-ignore
if (argv.file) {
  // @ts-ignore
  run(readFileSync(resolve(process.cwd(), argv.file), 'utf8'));
} else {
  stdin.setEncoding('utf8');

  if (process.stdin.isTTY) {
    showHelp();
  } else {
    stdin.on('data', function (chunk) {
      // @ts-ignore
      css.push(chunk);
    });

    stdin.on('end', function () {
      // @ts-ignore
      css = css.join();
      run(css);
    });
  }
}

function run(css: string | { toString(): string } | Root) {
  // @ts-ignore
  if (argv.options) {
    options = JSON.parse(
      // @ts-ignore
      readFileSync(resolve(process.cwd(), argv.options), 'utf8')
    );
  } else {
    // @ts-ignore
    if (argv.threshold) {
      // @ts-ignore
      options.threshold = argv.threshold;
    }
    // @ts-ignore
    options.allowEquivalentNotation = argv.allowEquivalentNotation;
  }
  // @ts-ignore
  if (argv.file) {
    options = Object.assign(
      {
        // @ts-ignore
        from: argv.file,
      },
      options
    );
  }
  processor(options)
    .process(css, { from: undefined })
    .then((result) => {
      if (result.warnings().length) {
        process.exit(1);
      }
    });
}

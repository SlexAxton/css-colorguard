import colorDiff from 'color-diff';
import synesthesia from 'synesthesia';
import rgba from 'color-rgba';
import type { Plugin, WarningOptions, PluginCreator } from 'postcss';
import type { Options } from '../../../types/global';
import type {
  Matches,
  Color,
  WhitelistHash,
  Colors,
} from '../../../types/processor';
const { rgba_to_lab, diff } = colorDiff;

const findColors = (str: string) => {
  const matches: Matches[] = [];
  let match, lines;

  // Match colors incrementally
  while ((match = synesthesia.all.exec(str)) !== null) {
    lines = str.slice(0, match.index).split('\n');

    matches.push({
      index: match.index,
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
      match: match[0],
      color: rgba(match[0])!,
    });
  }

  // Reset search indexes
  synesthesia.all.lastIndex = 0;

  return matches;
};

const convertToLab = (clr: Color) => {
  return rgba_to_lab({
    R: clr[0],
    G: clr[1],
    B: clr[2],
    A: clr[3],
  });
};

// Returns correct column number of the color declaration.
// findColors() finds the position from the beginning of value declaration,
// We need line position instead.
const getColumnPositionRelativeToLine = (position: Matches) => {
  const decl = position.declaration;
  return (
    decl?.source?.start?.column ??
    '' + position.column + decl?.prop.length ??
    ''
  );
};

const getWhitelistHashKey = (pair: string[]) => {
  pair = pair.sort();
  return pair[0] + '-' + pair[1];
}

const getDiff = (a: Color, b: Color) => {
  return Math.min(diff(convertToLab(a), convertToLab(b)), 100);
};

const stripUrl = /url\(['|"]?.*?['|"]?\)/;

const plugin: PluginCreator<Options> = (opts): Plugin => {
  opts = Object.assign(
    {
      ignore: [],
      threshold: 3,
    },
    opts
  );

  var whitelistHash: WhitelistHash = {};
  if (opts.whitelist) {
    opts.whitelist.forEach(function (pair: string[]) {
      if (!Array.isArray(pair)) {
        throw new Error(
          'The whitelist option takes an array of array pairs. ' +
            'You probably sent an array of strings.'
        );
      }
      whitelistHash[getWhitelistHashKey(pair)] = true;
    });
  }

  return {
    postcssPlugin: 'postcss-colorguard',
    Once(root, { result }) {
      const colors: Colors = {};

      root.walkDecls((decl) => {
        const cleanValue = decl.value.replace(stripUrl, '');
        const matches = findColors(cleanValue);
        matches.forEach((match) => {
          const name = match.match;
          // Just bail if we want to ignore the color
          if (opts?.ignore != undefined) {
            if (opts?.ignore?.indexOf(name) > -1) {
              return;
            }
          }

          match.declaration = decl;

          if (!(name in colors)) {
            colors[name] = colors[name] || [];
            colors[name].push(match);
          }

          Object.keys(colors).forEach((color) => {
            const cached = colors[color];
            if (cached[0] === match || cached[0].match === match.match) {
              return;
            }
            const diffAmount = getDiff(cached[0].color, match.color);

            // If colors are the same (no diff) but have a different representation
            // (e.g. #000 and #000000 and black), do not complain
            if (opts?.allowEquivalentNotation && diffAmount === 0) {
              return;
            }

            var whitelisted = getWhitelistHashKey([color, name]);
            if (opts?.threshold != undefined) {
              if (diffAmount < opts?.threshold && !whitelistHash[whitelisted]) {
                const message =
                  match.match +
                    ' collides with ' +
                    cached[0].match +
                    ' (' +
                    cached[0].declaration?.source?.start?.line ??
                  '' + ':' + getColumnPositionRelativeToLine(cached[0]) + ')';
                decl.warn(result, message, {
                  secondColor: match.match,
                  firstColor: cached[0].match,
                } as WarningOptions);
              }
            }
          });
        });
      });
    },
  };
};
plugin.postcss = true;

// @ts-ignore
export = plugin;

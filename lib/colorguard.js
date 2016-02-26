import assign    from 'object-assign';
import colorDiff from 'color-diff';
import pipetteur from 'pipetteur';
import postcss   from 'postcss';
import reporter  from 'postcss-reporter';
import formatter from './formatter';

function convertToLab (clr) {
  clr = clr.rgb();

  try {
    return colorDiff.rgb_to_lab({
      R: Math.round(clr.red() * 255),
      G: Math.round(clr.green() * 255),
      B: Math.round(clr.blue() * 255)
    });
  } catch (e) {
    throw new Error('Error converting color ' + clr.hex() + ' to lab format.');
  }
}

// returns correct column number of the color declaration
// pipetteur finds the position from the beginning of value declaration,
// we need line position instead
function getColumnPositionRelativeToLine (position) {
  const decl = position.declaration;
  return decl.source.start.column + position.column + decl.prop.length;
}

function getWhitelistHashKey (pair) {
  pair = pair.sort();
  return pair[0] + '-' + pair[1];
}

function getDiff (a, b) {
    return Math.min(colorDiff.diff(convertToLab(a), convertToLab(b)), 100);
}

const colorguard = postcss.plugin('css-colorguard', (opts) => {
  opts = assign({
    ignore: [],
    threshold: 3
  }, opts);

  const whitelistHash = {};
  if (opts.whitelist) {
    opts.whitelist.forEach((pair) => {
      if (!Array.isArray(pair)) {
        throw new Error('The whitelist option takes an array of array pairs. ' +
                        'You probably sent an array of strings.');
      }
      whitelistHash[getWhitelistHashKey(pair)] = true;
    });
  }

  return function (css, result) {
    const colors = {};

    css.walkDecls((decl) => {
      const matches = pipetteur(decl.value);
      matches.forEach((match) => {
        // FIXME: This discards alpha channel
        const name = match.color.hex();
        // Just bail if we want to ignore the color
        if (opts.ignore.indexOf(name) > -1) {
          return;
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

          const whitelisted = getWhitelistHashKey([color, name]);
          if (diffAmount < opts.threshold && !whitelistHash[whitelisted]) {
            decl.warn(result, match.match + ' collides with ' +
              cached[0].match +
              ' (' +
              cached[0].declaration.source.start.line +
              ':' +
              getColumnPositionRelativeToLine(cached[0]) +
              ')');
          }
        });
      });
    });
  };
});

colorguard.process = function (css, opts) {
  opts = opts || {};
  const processor = postcss([ colorguard(opts), reporter({formatter: formatter}) ]);
  return processor.process(css, opts);
};

module.exports = colorguard;

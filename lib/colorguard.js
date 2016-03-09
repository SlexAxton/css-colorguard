var assign = require('object-assign');
var Color = require('color');
var colorDiff = require('color-diff');
var formatter = require('./formatter');
var isCssColorHex = require('is-css-color-hex');
var isCssColorName = require('is-css-color-name');
var postcss = require('postcss');
var reporter = require('postcss-reporter');
var valueParser = require('postcss-value-parser');

var FUNC_REPRESENTATION = ['rgb', 'rgba', 'hsl', 'hsla', 'hwb'];
var NODE_TYPES = ['word', 'function']

function convertToLab (clr) {
  clr = clr.rgb();
  try {
    return colorDiff.rgb_to_lab({
      R: Math.round(clr.r),
      G: Math.round(clr.g),
      B: Math.round(clr.b)
    });
  } catch (e) {
    throw new Error('Error converting color ' + clr.hexString() + ' to lab format.');
  }
}

// returns correct column number of the color declaration
// pipetteur finds the position from the beginning of value declaration,
// we need line position instead
function getColumnPositionRelativeToLine (position) {
  var decl = position.declaration;
  return decl.source.start.column + position.column + decl.prop.length;
}

function getWhitelistHashKey (pair) {
  pair = pair.sort();
  return pair[0] + '-' + pair[1];
}

function getDiff (a, b) {
    return Math.min(colorDiff.diff(convertToLab(a), convertToLab(b)), 100);
}

var colorguard = postcss.plugin('css-colorguard', function (opts) {
  opts = assign({
    ignore: [],
    threshold: 3
  }, opts);

  var whitelistHash = {};
  if (opts.whitelist) {
    opts.whitelist.forEach(function (pair) {
      if (!Array.isArray(pair)) {
        throw new Error('The whitelist option takes an array of array pairs. ' +
                        'You probably sent an array of strings.');
      }
      whitelistHash[getWhitelistHashKey(pair)] = true;
    });
  }

  return function (css, result) {
    var colors = {};

    css.walkDecls(function (decl) {
      valueParser(decl.value).walk(function(node) {

        // Return early if the node isn't a function or word
        if (NODE_TYPES.indexOf(node.type) === -1) { return; }

        // Return early if a word isn't a valid hex or color name
        if (node.type === 'word' && !isCssColorHex(node.value) && !isCssColorName(node.value)) { return; }

        // Return early if the function isn't a color representation
        if (node.type === 'function' && FUNC_REPRESENTATION.indexOf(node.value) === -1) { return; }

        var match = {};

        // Consistent string representation of color
        if (node.type === 'function') {
          match.match = valueParser.stringify(node);
        } else {
          match.match = node.value;
        }

        match.color = Color(match.match);

        var name = match.color.hexString();

        // Just bail if we want to ignore the color
        if (opts.ignore.indexOf(name) > -1) { return; }

        match.declaration = decl;

        if (!(name in colors)) {
          colors[name] = colors[name] || [];
          colors[name].push(match);
        }

        Object.keys(colors).forEach(function (color) {
          var cached = colors[color];
          if (cached[0] === match || cached[0].match === match.match) {
            return;
          }
          var diffAmount = getDiff(cached[0].color, match.color);

          var whitelisted = getWhitelistHashKey([color, name]);
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
  var processor = postcss([ colorguard(opts), reporter({formatter: formatter}) ]);
  return processor.process(css, opts);
};

module.exports = colorguard;

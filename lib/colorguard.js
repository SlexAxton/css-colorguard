var pipetteur = require('pipetteur');
var colorDiff = require('color-diff');
var postcss = require('postcss');
var SourceMapConsumer = require('source-map').SourceMapConsumer;
var colors = {};
var sourceMapConsumer;

function getWhitelistHashKey(pair) {
  pair = pair.sort();
  return pair[0] + '-' + pair[1];
}

function convertToLab(clr) {
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
function getColumnPositionRelativeToLine(position, which) {
  return position.declaration.source[which].column + position.column + position.declaration.prop.length;
}

function renderOriginalPosition (position) {
  return position.source + ':' + position.line + ':' + position.column;
}

function renderConflictLine (data) {
  return '_match_ (_hex_) [line: _lines_]'
    .replace('_match_', data.lines[0].match)
    .replace('_hex_', data.lines[0].color.hex())
    .replace('_lines_', data.lines.map(function (info, index) {
      var result = info.declaration.source.start.line + ':' + getColumnPositionRelativeToLine(info, 'start');
      if (data.originalLines && data.originalLines.length) {
        result += ' (' + renderOriginalPosition(data.originalLines[index]) + ')';
      }
      return result;
    }).join(', '));
}

function getOriginalPosition (info) {
  return sourceMapConsumer && sourceMapConsumer.originalPositionFor({
    line: info.declaration.source.start.line,
    column: getColumnPositionRelativeToLine(info, 'start')
  });
}

exports.inspect = function (css, options, map) {
  options = options || {};
  colors = {};
  if (map) {
    sourceMapConsumer = new SourceMapConsumer(map);
  }

  var threshold = typeof options.threshold !== 'undefined' ? options.threshold : 3;
  options.ignore = options.ignore || [];

  var whitelistHash = {};
  if (options.whitelist) {
    options.whitelist.forEach(function (pair) {
      if (!Array.isArray(pair)) {
        throw new Error('The whitelist option takes an array of array pairs. You probably sent an array of strings.');
      }
      whitelistHash[getWhitelistHashKey(pair)] = true;
    });
  }

  var result = postcss(postcss.plugin('css-colorguard', function () {
    return function (css) {
      css.walkDecls(function (decl) {
        var matches = pipetteur(decl.value);

        if (matches.length) {
          matches.forEach(function (match) {
            // FIXME: This discards alpha channel
            var name = match.color.hex();

            match.declaration = decl;

            colors[name] = colors[name] || [];
            colors[name].push(match);
          });
        }
      });
    };
  })).process(css).css;

  var colorNames = Object.keys(colors);
  var colorLen = colorNames.length;
  var c1;
  var c2;
  var diffAmount;
  var infoBlock;


  // Mock the output structure
  var output = {
    collisions: [],
    info: [],
    stats: {
      counts: {}
    }
  };

  // Set the total number of different colors
  output.stats.total = colorLen;

  // Generate the stats for the colors
  colorNames.forEach(function (colorName) {
    // Counts of colors
    output.stats.counts[colorName] = colors[colorName].length;
  });

  // Loop over the object but avoid duplicates and collisions
  for (var i = 0; i < colorLen; i += 1) {
    // Just bail if we want to ignore this color altogether
    if (options.ignore.indexOf(colorNames[i]) >= 0) {
      continue;
    }

    for (var j = i + 1; j < colorLen; j += 1) {
      if (options.ignore.indexOf(colorNames[j]) >= 0) {
        continue;
      }

      // Convert each to rgb format
      c1 = colors[colorNames[i]];
      c2 = colors[colorNames[j]];

      // Avoid greater than 100 values
      diffAmount = Math.min(colorDiff.diff(convertToLab(c1[0].color), convertToLab(c2[0].color)), 100);

      // All distances go into the info block
      infoBlock = {
        colors: [{
          rgb: colorNames[i],
          lines: c1,
          originalLines: sourceMapConsumer && c1.map(getOriginalPosition) || []
        }, {
          rgb: colorNames[j],
          lines: c2,
          originalLines: sourceMapConsumer && c2.map(getOriginalPosition) || []
        }],
        distance: diffAmount
      };

      // push it onto the block
      output.info.push(infoBlock);

      // If the amount is less than the threshold, and if the two colors aren't whitelisted, then
      // we have a collision
      if (diffAmount < threshold && !whitelistHash[getWhitelistHashKey([colorNames[i], colorNames[j]])]) {
        infoBlock.message = '_1_ is too close (_diffAmount_) to _2_'
          .replace('_1_', renderConflictLine(infoBlock.colors[0]))
          .replace('_2_', renderConflictLine(infoBlock.colors[1]))
          .replace('_diffAmount_', diffAmount);

        output.collisions.push(infoBlock);
      }
    }
  }

  return output;
};

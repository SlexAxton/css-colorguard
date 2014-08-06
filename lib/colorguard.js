var walk = require('rework-walk');
var rework = require('rework');
var pipetteur = require('pipetteur');
var colorDiff = require('color-diff');
var colors = {};

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

function renderConflictLine(data) {
  return '_match_ (_hex_) [line: _lines_]'
    .replace('_match_', data[0].match)
    .replace('_hex_', data[0].color.hex())
    .replace('_lines_', data.map(function (info) {
      // Column calculation is not this simple :(
      //return info.declaration.position.start.line + ':' + (info.declaration.position.start.column + info.column);
      return info.declaration.position.start.line;
    }).join(', '));
}

exports.inspect = function (css, options) {
  options = options || {};
  colors = {};
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

  // In this section, we more or less ruin the actual css, but not for our purposes. The following
  // changes are necessary for the parser to not barf at us. We'll need to undo this if we ever
  // wanted to use the rework output. For now, it's fine as long as we keep the line numbers the
  // same.

  // https://github.com/SlexAxton/css-colorguard/issues/2

  css = css.replace(/url\((.*?#.*?)\)/ig, function (match, content) {
    // Capture the content in order to replace with a similar length string
    // This allows us to keep the column numer correct
    return match.replace(content, new Array(content.length + 1).join('_'));
  });

  // Run rework over it so we can parse out all the colors
  // rework(css).use(findColors()).toString();
  var workingTree = rework(css).use(function (style) {
    walk(style, function (rule) {
      if (rule.declarations) {
        rule.declarations.forEach(function (declaration) {
          if (declaration.type === 'declaration') {
            var matches = pipetteur(declaration.value);

            if (matches.length) {
              matches.forEach(function (match) {
                // FIXME: This discards alpha channel
                var name = match.color.hex();

                match.declaration = declaration;

                colors[name] = colors[name] || [];
                colors[name].push(match);
              });
            }
          }
        });
      }
    });
  });

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
          lines: c1
        }, {
          rgb: colorNames[j],
          lines: c2
        }],
        distance: diffAmount
      };

      // push it onto the block
      output.info.push(infoBlock);

      // If the amount is less than the threshold, and if the two colors aren't whitelisted, then
      // we have a collision
      if (diffAmount < threshold && !whitelistHash[getWhitelistHashKey([colorNames[i], colorNames[j]])]) {
        infoBlock.message = '_1_ is too close (_diffAmount_) to _2_'
          .replace('_1_', renderConflictLine(c1))
          .replace('_2_', renderConflictLine(c2))
          .replace('_diffAmount_', diffAmount);

        output.collisions.push(infoBlock);
      }
    }
  }

  return output;
};

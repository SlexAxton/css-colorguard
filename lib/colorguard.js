var walk = require('rework-walk');
var rework = require('rework');
var color = require('color-diff');
var colors = {};

function ident(name, args) {
  // A Single way of spacing naming, etc.
  var formattedResult = name.toLowerCase() + '(' + args.join(',') + ')';
  return formattedResult;
}

function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return ("#" + componentToHex(parseInt(r,10)) + componentToHex(parseInt(g,10)) + componentToHex(parseInt(b))).toUpperCase();
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    R: parseInt(result[1], 16),
    G: parseInt(result[2], 16),
    B: parseInt(result[3], 16)
  } : null;
}

function hue2rgb(p, q, t) {
  if(t < 0) t += 1;
  if(t > 1) t -= 1;
  if(t < 1/6) return p + (q - p) * 6 * t;
  if(t < 1/2) return q;
  if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l) {
  var r;
  var g;
  var b;

  if (s == 0) {
    r = g = b = l;
  }
  else {
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  var out = [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  return out;
}

var functions = {
  rgb: function(r, g, b) {
    if (r.indexOf && r.indexOf('%') > 0) {
      r = 255 * (parseInt(r, 10) / 100);
    }
    if (g.indexOf && g.indexOf('%') > 0) {
      g = 255 * (parseInt(g, 10) / 100);
    }
    if (b.indexOf && b.indexOf('%') > 0) {
      b = 255 * (parseInt(b, 10) / 100);
    }
    var normalizedColor = rgbToHex(r, g, b);
    // Add it to the color hash
    colors[normalizedColor] = colors[normalizedColor] || [];
    colors[normalizedColor].push(this.position.start.line);

    return ident('rgb', [].slice.call(arguments));
  },
  rgba: function(r, g, b, a) {
    functions.rgb.call(this, r, g, b);
    return ident('rgba', [].slice.call(arguments));
  },
  hsl: function(h, s, l) {
    h = (h % 360)/360;
    if (s.indexOf && s.indexOf('%') > 0) {
      s = parseInt(s, 10) / 100;
    }
    if (l.indexOf && l.indexOf('%') > 0) {
      l = parseInt(l, 10) / 100;
    }
    functions.rgb.apply(this, hslToRgb(h, s, l));
    return ident('hsl', [].slice.call(arguments));
  },
  hsla: function(h, s, l, a) {
    functions.hsl.call(this, h, s, l);
    return ident('hsla', [].slice.call(arguments));
  }
};

function findColors(options, args) {
  return function(style) {
    var functionMatcher = functionMatcherBuilder(Object.keys(functions).join('|'));

    walk(style, function(rule) {
      if (rule.declarations) {
        declarationParser(rule.declarations, functions, functionMatcher, args);
      }
    });
  }
};

function normalizeHexColor(color) {
  if (color.length === 4) {
    color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color.toUpperCase();
}

var reHexColor = /#([A-Fa-f0-9]){3,6}/g;

function findHexColors(decl) {
  // Grab all hex colors in the declaration
  var hexColors = decl.value.match(reHexColor) || [];
  // Add each of them to the colors hash
  hexColors.forEach(function(color) {
    color = normalizeHexColor(color);
    colors[color] = colors[color] || [];
    colors[color].push(decl.position.start.line);
  })
}

function declarationParser(declarations, functions, functionMatcher, parseArgs) {
  if (false !== parseArgs) parseArgs = true;

  declarations.forEach(function(decl) {
    // We don't care about comments
    if ('comment' == decl.type) return;
    var generatedFuncs = [], result, generatedFunc;

    // First pull out hex colors
    findHexColors(decl);

    // We actively go in and replace each one of them, so we don't hit the same
    // function more than once. This is more or less the exact thing that the
    // rework-plugin-color plugin does, so it's been more nicely tested than a less
    // 'invasive' alternative (which would be preferable if we ever want to output
    // css in the end).
    // TODO: consider non-recursive implementation. Would make things simpler. I'm not sure
    // there's a great reason to support it other than non-fully-compiled rework support.

    // While our declaration contains a function (In some worlds they can be nested)
    while (decl.value.match(functionMatcher)) {

      // replace the function with...
      decl.value = decl.value.replace(functionMatcher, function(_, name, args) {

        // Split out the values between the commas
        if (parseArgs) {
          args = args.split(/\s*,\s*/).map(strip);
        } else {
          args = [strip(args)];
        }

        // Run the related function that was passed in based on the name
        // Ensure result is string
        result = '' + functions[name].apply(decl, args);

        // Replace the function with a uniquely generated name for now so we don't hit it again.
        generatedFunc = {from: name, to: name + getRandomString()};
        result = result.replace(functionMatcherBuilder(name), generatedFunc.to + '($2)');

        // Push this onto the list of things we need to reconcile later
        generatedFuncs.push(generatedFunc);

        // return the replaced value
        return result;
      });
    }

    // Go back through the things we messed up, and replace each of the unique ids with their
    // original function names now that we're done recursing.
    generatedFuncs.forEach(function(func) {
      decl.value = decl.value.replace(func.to, func.from);
    })
  });
}

function functionMatcherBuilder(name) {
  // /(?!\W+)(\w+)\(([^()]+)\)/
  return new RegExp("(?!\\W+)(" + name + ")\\(([^\(\)]+)\\)");
}

function getRandomString() {
  return Math.random().toString(36).slice(2);
}

function strip(str) {
    if ('"' == str[0] || "'" == str[0]) return str.slice(1, -1);
    return str;
}

function getWhitelistHashKey(pair) {
  pair = pair.sort();
  return pair[0] + '-' + pair[1];
}

function convertToLab(colorName) {
    try {
        return color.rgb_to_lab(hexToRgb(colorName));
    } catch (e) {
        throw new Error('Error converting color '+colorName+' to lab format.');
    }
}

exports.inspect = function(css, options) {
  colors = {};
  var options = options || {};
  var threshold = typeof options.threshold !== 'undefined' ? options.threshold : 3;
  options.ignore = options.ignore || [];

  var whitelistHash = {};
  if (options.whitelist) {
    options.whitelist.forEach(function(pair) {
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
  rework(css).use(findColors()).toString();

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
  Object.keys(colors).forEach(function(colorName) {
    // Counts of colors
    output.stats.counts[colorName] = colors[colorName].length;
  });

  // Loop over the object but avoid duplicates and collisions
  for (var i = 0; i < colorLen; ++i) {
    // Just bail if we want to ignore this color altogether
    if (options.ignore.indexOf(colorNames[i]) >= 0) continue;

    for(var j = i + 1; j < colorLen; ++j) {
      if (options.ignore.indexOf(colorNames[j]) >= 0) continue;
      // Convert each to lab format
      c1 = convertToLab(colorNames[i]);
      c2 = convertToLab(colorNames[j]);

      // Avoid greater than 100 values
      diffAmount = Math.min(color.diff(c1, c2), 100);

      // All distances go into the info block
      infoBlock = {
        colors: [{
          rgb: colorNames[i],
          lines: colors[colorNames[i]]
        }, {
          rgb: colorNames[j],
          lines: colors[colorNames[j]]
        }],
        distance: diffAmount
      };

      // push it onto the block
      output.info.push(infoBlock);

      // If the amount is less than the threshold, and if the two colors aren't whitelisted, then
      // we have a collision
      if (diffAmount < threshold && !whitelistHash[getWhitelistHashKey([colorNames[i], colorNames[j]])] ) {
        infoBlock.message = colorNames[i] +
                            ' [line: ' + colors[colorNames[i]].join(', ') + ']' +
                            ' is too close (' + diffAmount + ') to ' + colorNames[j] +
                            ' [line: ' + colors[colorNames[j]].join(', ') + ']';

        output.collisions.push(infoBlock);
      }
    }
  }

  return output;
};

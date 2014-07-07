var visit = require('rework-visit');
var rework = require('rework');
var cssColorNames = require('css-color-names');
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
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    R: parseInt(result[1], 16),
    G: parseInt(result[2], 16),
    B: parseInt(result[3], 16)
  } : null;
}

function hue2rgb(p, q, t){
  if(t < 0) t += 1;
  if(t > 1) t -= 1;
  if(t < 1/6) return p + (q - p) * 6 * t;
  if(t < 1/2) return q;
  if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function hslToRgb(h, s, l){
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

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

var functions = {
  rgb: function(r, g, b) {
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
    functions.rgb.apply(this, hslToRgb(h, s, l));
    return ident('hsl', [].slice.call(arguments));
  },
  hsla: function(h, s, l, a) {
    functions.rgb.apply(this, hslToRgb(h, s, l));
    return ident('hsla', [].slice.call(arguments));
  }
};

function findColors(options, args) {
  return function(style) {
    var functionMatcher = functionMatcherBuilder(Object.keys(functions).join('|'));

    visit(style, function(declarations){
      declarationParser(declarations, functions, functionMatcher, args);
    });
  }
};

function normalizeHexColor(color) {
  if (color.length === 4) {
    return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  return color;
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

  declarations.forEach(function(decl){
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
      decl.value = decl.value.replace(functionMatcher, function(_, name, args){

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

exports.inspect = function(css, options) {
  colors = {};
  var options = options || {};
  var threshold = typeof options.threshold !== 'undefined' ? options.threshold : 5;
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

  // First just replace css named colors with their hex equivalents before we parse
  // This'll need to probably be different if we want to output ideal css
  Object.keys(cssColorNames).forEach(function(colorName) {
    css = css.replace(new RegExp("[^A-Za-z]" + colorName, 'ig'), cssColorNames[colorName]);
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
      c1 = color.rgb_to_lab(hexToRgb(colorNames[i]));
      c2 = color.rgb_to_lab(hexToRgb(colorNames[j]));

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

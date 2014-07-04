var visit = require('rework-visit');
var rework = require('rework');

function findColors() {
  var functions = {
    rgb: true,
    rgba: true,
    hsl: true,
    hsla: true
  };

  return function(style) {
    var functionMatcher = functionMatcherBuilder(Object.keys(functions).join('|'));

    visit(style, function(declarations){
      func(declarations, functions, functionMatcher, args);
    });
  }
};

function func(declarations, functions, functionMatcher, parseArgs) {
  if (false !== parseArgs) parseArgs = true;

  declarations.forEach(function(decl){
    if ('comment' == decl.type) return;
    var generatedFuncs = [], result, generatedFunc;

    while (decl.value.match(functionMatcher)) {
      decl.value = decl.value.replace(functionMatcher, function(_, name, args){
        if (parseArgs) {
          args = args.split(/\s*,\s*/).map(strip);
        } else {
          args = [strip(args)];
        }
        // Ensure result is string
        result = '' + functions[name].apply(decl, args);

        generatedFunc = {from: name, to: name + getRandomString()};
        result = result.replace(functionMatcherBuilder(name), generatedFunc.to + '($2)');
        generatedFuncs.push(generatedFunc);
        return result;
      });
    }

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

exports.inspect = function(css, options) {
  return {
    stats: {
      counts: {
        "#000000": 2
      }
    }
  };
};

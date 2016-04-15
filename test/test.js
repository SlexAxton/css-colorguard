var postcss = require('postcss');
var colorguard = require('..');
var tape = require('tape');

var check = function (css, options, callback) {
  postcss(colorguard(options)).process(css).then(function (result) {
    callback(result.css, result.warnings());
  });
};

var tests = [{
  message: 'weird behavior (1)',
  fixture: '.weird-behavior {\n  behavior: url(#default#VML);\n}',
  warnings: 0,
}, {
  message: 'weird behavior (2)',
  fixture: '.glyphicon {\n  -moz-osx-font-smoothing: grayscale;\n}',
  warnings: 0
}, {
  message: 'weird behavior (3)',
  fixture: [
    '.classnameWithoutColorName .widget.button-widget {\n  margin: auto 2px;\n  border-color: #b1afb0;\n}\n',
    '.grey .widget.button-widget a:link, .grey .widget.button-widget a:hover {\n  color: #b1afb0;\n}'
  ].join(''),
  warnings: 0
}, {
  message: 'whitelist',
  fixture: '.classname {\n  background-image: -webkit-linear-gradient(rgba(0,0,0,1), #020202);\n  color: #000000;\n}',
  warnings: 1,
  options: {whitelist: [['#000000', '#020202']]},
  warningsColors: [{ secondColor: '#000000', firstColor: 'rgba(0,0,0,1)' }]
}, {
  message: 'no warnings, using the ignore option',
  fixture: 'h1 {\n  color: black;\n  color: #010101;\n}',
  warnings: 0,
  options: {ignore: ['#000000']}
}, {
  message: 'no warnings, using the threshold option',
  fixture: 'h1 {\n  color: black;\n  color: #010101;\n}',
  warnings: 0,
  options: {threshold: 0}
}, {
  message: 'no warnings; comment with hex code & named color',
  fixture: [
    '/* This is a comment with #000000 in it */\n',
    '#crazy {\n  color: black;\n  /* a named color! */\n  background-color: rebeccapurple;\n}'
  ].join(''),
  warnings: 0
}, {
  message: 'one warning (1)',
  fixture: 'h1 {\n  color: black;\n  color: #010101;\n}',
  warnings: 1,
  warningsColors: [{ secondColor: '#010101', firstColor: 'black' }]
}, {
  message: 'one warning (2)',
  fixture: [
    '@-webkit-keyframes spin {\n',
    '  /* This comment used to break things */\n',
    '  0% {\n    -webkit-transform: rotate(0deg);\n    color: #010101;\n  }\n',
    '  100% {\n    -webkit-transform: rotate(360deg);\n    /* It should still pick this one up */\n    color: #000000;\n',
    '  }\n}'
  ].join(''),
  warnings: 1,
  warningsColors: [{ secondColor: '#000000', firstColor: '#010101' }]
}, {
  message: 'two warnings',
  fixture: 'h1 {\n  color: #20dfb3;\n  color: #22ddb1;\n}\nh2 {\n  color: #20dfb3;\n}',
  warnings: 2,
  warningsColors: [
    { secondColor: '#22ddb1', firstColor: '#20dfb3' },
    { secondColor: '#20dfb3', firstColor: '#22ddb1' }
  ]
}, {
  message: 'three warnings',
  fixture: '.classname {\n  background-image: -webkit-linear-gradient(rgba(0,0,0,1), #020202);\n  color: #000000;\n}',
  warnings: 3,
  warningsColors: [
    { secondColor: '#020202', firstColor: 'rgba(0,0,0,1)' },
    { secondColor: '#000000', firstColor: 'rgba(0,0,0,1)' },
    { secondColor: '#000000', firstColor: '#020202' }
  ]
}, {
  message: 'don\'t fail in urls',
  fixture: '.classname {\n  background-image: url("image-white.png");\n  color: #fff;\n}',
  warnings: 0
}, {
  message: 'don\'t break backgrounds with urls',
  fixture: '.classname {\n  background: url(image.png) white;\n  color: #fff;\n}',
  warnings: 1,
  warningsColors: [
    { secondColor: '#fff', firstColor: 'white' }
  ]
}, {
  message: 'identical but different length hexes with default setting',
  fixture: '.foo { color: #888; } .bar { color: #888888; }',
  warnings: 1,
  warningsColors: [
    { secondColor: '#888888', firstColor: '#888' }
  ]
}, {
  message: 'identical but different length hexes with `allowEquivalentNotation`',
  fixture: '.foo { color: #888; } .bar { color: #888888; }',
  warnings: 0,
  options: { allowEquivalentNotation: true }
}];

tests.forEach(function (test) {
  tape(test.message, function (t) {
    t.plan(3);

    check(test.fixture, test.options, function (css, warnings) {
      t.equal(String(css), test.fixture, 'should not modify the css');
      t.equal(warnings.length, test.warnings, 'should send the correct number of warnings');
      var warningsColors = warnings.map(function(warning) {
        return { secondColor: warning.secondColor, firstColor: warning.firstColor };
      });
      t.deepEqual(warningsColors, test.warningsColors || [], 'should identify the correct colors');
    });
  });
});

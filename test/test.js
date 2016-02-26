import postcss    from 'postcss';
import tape       from 'tape';
import colorguard from '..';

const check = function (css, options, callback) {
  postcss(colorguard(options)).process(css).then((result) => {
    callback(result.css, result.warnings());
  });
};

const tests = [{
  message: 'weird behavior (1)',
  fixture: '.weird-behavior {\n  behavior: url(#default#VML);\n}',
  warnings: 0
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
  options: {whitelist: [['#000000', '#020202']]}
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
  warnings: 1
}, {
  message: 'one warning (2)',
  fixture: [
    '@-webkit-keyframes spin {\n',
    '  /* This comment used to break things */\n',
    '  0% {\n    -webkit-transform: rotate(0deg);\n    color: #010101;\n  }\n',
    '  100% {\n    -webkit-transform: rotate(360deg);\n    /* It should still pick this one up */\n    color: #000000;\n',
    '  }\n}'
  ].join(''),
  warnings: 1
}, {
  message: 'two warnings',
  fixture: 'h1 {\n  color: #20dfb3;\n  color: #22ddb1;\n}\nh2 {\n  color: #20dfb3;\n}',
  warnings: 2
}, {
  message: 'three warnings',
  fixture: '.classname {\n  background-image: -webkit-linear-gradient(rgba(0,0,0,1), #020202);\n  color: #000000;\n}',
  warnings: 3
}];

tests.forEach((test) => {
  tape(test.message, (t) => {
    t.plan(2);

    check(test.fixture, test.options, (css, warnings) => {
      t.equal(String(css), test.fixture, 'should not modify the css');
      t.equal(warnings.length, test.warnings, 'should send the correct number of warnings');
    });
  });
});

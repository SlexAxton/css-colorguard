var colorguard = require('..');
var fs = require('fs');
var css = fs.readFileSync(__dirname + '/fixtures/simple.css', 'utf8');

describe('inspect', function() {
  it('should normalize all types of color inputs', function() {
    // It should ignore comments too
    colorguard.inspect(css).stats.counts['#000000'].should.equal(8);
  });

  it('should collide on all closer than 5 by default', function() {
    // #000000, #010101
    // #000000, #020202
    // #010101, #020202
    colorguard.inspect(css).collisions.length.should.equal(3);
  });

  it('should allow you to ignore entire colors', function() {
    // #010101, #020202
    colorguard.inspect(css,{ignore: ['#000000']}).collisions.length.should.equal(1);
  });

  it('should allow you to whitelist collisions', function() {
    // #000000, #020202
    // #010101, #020202
    colorguard.inspect(css,{whitelist: [['#000000', '#010101']]}).collisions.length.should.equal(2);
  });

  it('should allow you to change the threshold', function() {
    // #000000, #010101 is 0.3146196209793196, so it's ok now
    colorguard.inspect(css,{threshold: 0.25}).collisions.length.should.equal(2);
  });

  it('should have a normalized total count', function() {
    colorguard.inspect(css).stats.total.should.equal(6);
  });
});

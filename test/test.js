var colorguard = require('..');
var fs = require('fs');

describe('inspect', function() {
  it('should detect rgb functions', function() {
    var output = colorguard.inspect(fs.readFileSync(__dirname + '/fixtures/simple.css', 'utf8'));
    output.stats.counts['#000000'].should.equal(2);
  });
});

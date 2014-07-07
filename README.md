[![Build Status](https://travis-ci.org/SlexAxton/css-colorguard.svg?branch=master)](https://travis-ci.org/SlexAxton/css-colorguard)

# CSS Colorguard

Every CSS project starts out with good intentions, but inevitably, one too many people eye-dropper
colors into nooks and crannies that you never knew existed. CSS Colorguard helps you maintain the
color set that you want, and warns you when colors you've added are too similar to ones that already
exist. Naturally, it's all configurable to your tastes.

## Usage

Generally, you'll want to do this after you've run things through your css preprocessor, so variables
and other preprocessor specific things are out of the way.

### Command Line

```bash
# Just regular
colorguard file.css

# Threshold is available via command line
colorguard file.css --threshold 5

# The other options are too hard to type, so just pass it a json object
# with `ignore` or `whitelist` properties (overrides `--threshold option`)
colorguard file.css --options colorguardoptions.json
```

### Programmatic

```javascript
var colorguard = require('colorguard');
var fs = require('fs');

var css = fs.readFileSync('./file.css', 'utf8');

var output = colorguard.inspect(css, {
  // 0 through 100. Lower is more similar. Anything below 5 warns you.
  threshold: 5,

  // This color is just ignored entirely (use with caution)
  ignore: ["#030303"],

  // These color combinations are ignored (usually use this)
  whitelist: [["#000000", "#010101"]]
});
```

## The Output

You'll get an object back (json if you're doing the command line) that has warnings, as well as some
additional color stats. Those are just for fun or whatever.

```json
{
  "collisions": [
    {
      "colors": [
        {
          "rgb": "#010101",
          "lines": [23, 45, 234]
        },
        {
          "rgb": "#020202",
          "lines": [29]
        }
      ],
      "distance": 0.1574963682909058,
      "message": "#010101 (lines: 23, 45, 234) is only a 0.123 difference from #020202 (line: 29)."
    }
  ],
  "stats": {
    "counts": {
      "#010101": 3,
      "#020202": 1,
      "#030303": 0
    }
  }
}
```

## How it works

Colorguard uses the [CIEDE2000](http://en.wikipedia.org/wiki/Color_difference) algorithm to determine
the similarity of each of the colors in your CSS file. This algorithm is quite complex, but is used
in the broadcasting community as the best approximation of human ability to discern differences in
color. RGB on the other hand, is pretty bad at representing differences in color purely based on the
numerical difference of the hex values.

Luckily, [someone else already implemented CIEDE2000](https://github.com/markusn/color-diff), so I
didn't have to. Tight. Cause this thing is mathy as hell.

![http://f.cl.ly/items/061h1y0x0G2X2e2t1q1f/Screen%20Shot%202014-07-03%20at%205.55.17%20PM.png](http://f.cl.ly/items/061h1y0x0G2X2e2t1q1f/Screen%20Shot%202014-07-03%20at%205.55.17%20PM.png)

### Alpha Transparency

Currently, alpha transparency is just stripped from the colors. So `rgb(0, 0, 0)` exactly matches
`rgba(0,0,0,0.5)`. This is usually fine unless someone is alphatransparency-happy and uses it for
darkening and lightening colors too often. It could probably be it's own check in the future that
there aren't too many different alpha transparencies of the same color. This is not currently a
thing though.

## Thanks

* [Stripe](https://stripe.com/) - They let me build this at work
* [reworkcss](https://github.com/reworkcss) - Makes this work
* [@markusn](https://github.com/markusn) - Best CIEDE2000 implementation ever

## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](http://www.apache.org/licenses/LICENSE-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

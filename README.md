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
colorguard file.css --options guard.json
```

### Programmatic

```javascript
var colorguard = require('colorguard');
var fs = require('fs');

var css = fs.readFileSync('./file.css', 'utf8');

var output = colorguard.inspect(css, {
  threshold: 0.5,
  ignore: ["#030303"]
});
```

## The Output

You'll get an oject back (json if you're doing the command line) that has warnings, as well as some
additional color stats that we have so pass you for convenience.

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
      }],
      "score": 0.123,
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

## Thanks

* [Stripe](https://stripe.com/) - They let me build this at work
* [reworkcss](https://github.com/reworkcss) - Makes this work

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

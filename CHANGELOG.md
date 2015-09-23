# CSS COLORGUARD CHANGELOG

## 2015-09-23 - 1.0.0

- Switched to PostCSS from reworkcss
- Added a CHANGELOG per PostCSS guidelines for plugins
- Changed the output format to use postcss notification api
- Exposes self as a postcss plugin
- `inspect` is now `process` in order to match PostCSS style
- Test suite changed to @substack's tape
- Supports sourcemap inputs via PostCSS api

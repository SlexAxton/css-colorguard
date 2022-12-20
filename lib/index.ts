import postcss from "postcss";
import plugin from "./colorguard";
import formatter from './formatter';
import reporter from 'postcss-reporter';

export const processor = (opts: Options) => postcss([plugin(opts), reporter({ formatter: formatter, filter: function(message) { return true } })]);

export default plugin;
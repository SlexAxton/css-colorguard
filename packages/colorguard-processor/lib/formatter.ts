import { gray, red, white, underline, bold } from 'colorette';
import { relative } from 'path';
import table from 'text-table';
import plur from 'plur';
import logSymbols from 'log-symbols';
import type { Message } from 'postcss';

const logFrom = (fromValue: string) => {
  if (!fromValue.indexOf('<')) {
    return fromValue;
  }
  return relative(process.cwd(), fromValue);
};

const collisions = (messages: Message[]) => {
  const num = messages.length + plur(' collision', messages.length);
  return '\n\n  ' + red(logSymbols.error) + '  ' + white(num + ' found.\n');
};

export default function (input: { messages: Message[]; source: string }) {
  const messages = input.messages;
  const source = input.source;

  if (!messages.length) {
    return '  ' + logSymbols.success + '  No collisions found.';
  }

  const filename = underline(logFrom(source)) + '\n';

  return (
    filename +
    table(
      messages.map((msg) => {
        const last = msg.text.lastIndexOf('(');
        const warning = msg.text.slice(0, last).trim().split(/\s+/);
        const position = msg.text.slice(last, msg.text.length);
        return [
          '',
          gray('line ' + msg.node.source.start.line),
          gray('col ' + msg.node.source.start.column),
          red(
            underline(bold(warning[0])) +
              ' ' +
              (warning[1] + ' ' + warning[2]) +
              ' ' +
              underline(bold(warning[3]))
          ),
          gray(position),
        ];
      })
    ) +
    collisions(messages)
  );
}

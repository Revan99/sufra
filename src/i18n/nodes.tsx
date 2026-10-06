// t() for messages whose parameters are elements ("{n} of {target} kcal" with a big styled number), so each locale
// keeps its own word order instead of the UI gluing translated pieces together.
import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { t } from './index.ts';
import type { MessageKey } from './index.ts';

/** Splits a template into text and {name} placeholders: 'a {x} b' -> ['a ', { name: 'x' }, ' b']. */
export function splitTemplate(template: string): (string | { name: string })[] {
  const out: (string | { name: string })[] = [];
  const re = /\{(\w+)\}/g;
  let last = 0;
  for (let m = re.exec(template); m; m = re.exec(template)) {
    if (m.index > last) out.push(template.slice(last, m.index));
    out.push({ name: m[1] as string });
    last = m.index + m[0].length;
  }
  if (last < template.length) out.push(template.slice(last));
  return out;
}

/** The message for `key` with element parameters placed where the translation puts them. */
export function tx(key: MessageKey, params: Readonly<Record<string, ReactNode>>): ReactNode {
  // Placeholders are left in by t() (no params), then swapped for the elements.
  return splitTemplate(t(key)).map((part, i) =>
    typeof part === 'string' ? <Fragment key={i}>{part}</Fragment> : <Fragment key={i}>{Object.hasOwn(params, part.name) ? params[part.name] : `{${part.name}}`}</Fragment>,
  );
}

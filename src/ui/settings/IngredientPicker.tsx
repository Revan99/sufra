// Searchable picker for disliked ingredients: type to find, tap to add, tap a chip to remove. Every result and
// chip says how many recipes it rules out, a search word offers the whole family ("All 4 with “onion”"), and the
// total is shown, with a warning when it takes out a large part of the library.
import { useId, useState } from 'react';
import { t, tp } from '../../i18n/index.ts';
import { listJoin } from '../../i18n/labels.ts';
import { recipesUsing, useLibrary } from '../library.tsx';
import { Icon } from '../components/Icon.tsx';
import { useToast } from '../components/Toast.tsx';
import { ingredientFamily, ingredientMatches } from './pickerModel.ts';

const MAX_RESULTS = 8;
/** Above this share of the library, the total is shown as a warning. */
const WARN_SHARE = 0.25;

export function IngredientPicker({ selected, onChange }: { selected: readonly string[]; onChange: (ids: string[]) => void }) {
  const lib = useLibrary();
  const notify = useToast();
  const [query, setQuery] = useState('');
  const inputId = useId();
  const listId = useId();
  const nameOf = (id: string) => lib.ingredientIndex.get(id)?.name ?? id.replace(/-/g, ' ');
  const count = (ids: Iterable<string>) => recipesUsing(lib, ids).size;
  const chosen = new Set(selected);
  const matches = ingredientMatches(query, lib.ingredients).filter((i) => !chosen.has(i.id));
  const shown = matches.slice(0, MAX_RESULTS);
  const family = ingredientFamily(query, lib.ingredients);
  const familyNew = family ? family.members.filter((i) => !chosen.has(i.id)) : [];
  const total = count(selected);
  const warn = total > lib.catalog.length * WARN_SHARE;

  const add = (ids: string[], label: string) => {
    const next = [...selected, ...ids.filter((id) => !chosen.has(id))];
    onChange(next);
    setQuery('');
    notify(tp('picker.added', count(ids), { name: label }));
    document.getElementById(inputId)?.focus();
  };

  return (
    <div className="picker">
      {selected.length ? (
        <>
          <ul className="picked">
            {selected.map((id) => (
              <li key={id}>
                <button type="button" className="chip chip-remove" onClick={() => onChange(selected.filter((x) => x !== id))}>
                  <span className="visually-hidden">{t('common.removeWord')} </span>
                  <span>{nameOf(id)}</span>{' '}
                  <span className="chip-count num">{tp('picker.recipes', count([id]))}</span>
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <p className={warn ? 'notice picker-total' : 'field-hint picker-total'}>
            {warn ? <Icon name="info" size={20} /> : null}
            {tp(warn ? 'picker.totalWarn' : 'picker.total', selected.length, { n: total, total: lib.catalog.length })}
          </p>
        </>
      ) : (
        <p className="field-hint">{t('picker.none')}</p>
      )}
      <label htmlFor={inputId} className="field-label">
        {t('picker.search')}
      </label>
      <div className="search-field">
        <Icon name="search" size={20} />
        <input
          id={inputId}
          type="search"
          value={query}
          placeholder={t('picker.placeholder')}
          onChange={(e) => setQuery(e.currentTarget.value)}
          autoComplete="off"
          aria-controls={listId}
        />
      </div>
      <div id={listId} aria-live="polite">
        {query.trim() && shown.length === 0 && familyNew.length < 2 ? <p className="field-hint">{t('picker.noResults', { q: query.trim() })}</p> : null}
        {shown.length || familyNew.length >= 2 ? (
          <ul className="picker-results">
            {family && familyNew.length >= 2 ? (
              <li>
                <button type="button" className="picker-option picker-family" onClick={() => add(familyNew.map((i) => i.id), t('picker.family', { n: familyNew.length, q: family.word }))}>
                  <Icon name="plus" size={18} />
                  <span className="picker-option-text">
                    <span className="picker-option-name">{t('picker.family', { n: familyNew.length, q: family.word })}</span>
                    <span className="picker-option-desc">{listJoin(familyNew.map((i) => i.name))}</span>
                  </span>{' '}
                  <span className="picker-option-count num">{tp('picker.recipes', count(familyNew.map((i) => i.id)))}</span>
                </button>
              </li>
            ) : null}
            {shown.map((i) => (
              <li key={i.id}>
                <button type="button" className="picker-option" onClick={() => add([i.id], i.name)}>
                  <Icon name="plus" size={18} />
                  <span className="picker-option-text">
                    <span className="picker-option-name">{i.name}</span>
                  </span>{' '}
                  <span className="picker-option-count num">{tp('picker.recipes', count([i.id]))}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {matches.length > MAX_RESULTS ? <p className="field-hint">{t('picker.more', { n: matches.length - MAX_RESULTS })}</p> : null}
      </div>
    </div>
  );
}

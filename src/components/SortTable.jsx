import { useState } from 'react';

/** טבלה שאפשר למיין לפי כל עמודה. לחיצה שנייה הופכת כיוון. */
export default function SortTable({ rows, columns, rowKey, rowClass }) {
  const [sort, setSort] = useState({ key: columns[0].key, dir: 1 });
  const col = columns.find((c) => c.key === sort.key);
  const val = (r) => (col.sort ? col.sort(r) : r[col.key]);
  const sorted = [...rows].sort((a, b) => {
    const A = val(a);
    const B = val(b);
    if (A === B) return 0;
    return (A > B ? 1 : -1) * sort.dir;
  });
  return (
    <div className="table-scroll">
      <table className="sort-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} aria-sort={sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                <button onClick={() => setSort((s) => ({ key: c.key, dir: s.key === c.key ? -s.dir : 1 }))}>
                  {c.label}
                  <span className="arrow" aria-hidden="true">{sort.key === c.key ? (sort.dir === 1 ? '▲' : '▼') : '△'}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} className={rowClass?.(r)}>
              {columns.map((c) => <td key={c.key} className={c.mono ? 'mono' : ''}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

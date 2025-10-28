export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

export async function api<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`);
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export function Pager({page, perPage, total, onPage}:{page:number; perPage:number; total:number; onPage:(p:number)=>void}){
  const pages = Math.max(1, Math.ceil(total / perPage));
  return (
    <div style={{display:'flex', gap:8, alignItems:'center', margin:'16px 0'}}>
      <button onClick={()=>onPage(Math.max(1, page-1))} disabled={page<=1}>Prev</button>
      <span>Page {page} / {pages}</span>
      <button onClick={()=>onPage(Math.min(pages, page+1))} disabled={page>=pages}>Next</button>
    </div>
  );
}

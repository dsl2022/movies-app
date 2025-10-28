export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

// Log API_BASE on load for debugging
console.log('[API] Base URL:', API_BASE);

export async function api<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}`;
  console.log('[API] Fetching:', url);

  try {
    const r = await fetch(url);
    console.log('[API] Response status:', r.status, r.statusText);

    if (!r.ok) {
      const text = await r.text();
      console.error('[API] Error response:', text);
      throw new Error(`API Error: ${r.status} ${r.statusText}`);
    }

    const data = await r.json();
    console.log('[API] Success:', path);
    return data;
  } catch (error) {
    console.error('[API] Failed:', url, error);
    throw error;
  }
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

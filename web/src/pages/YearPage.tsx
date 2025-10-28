import React from 'react';
import { useParams } from 'react-router-dom';
import { api, Pager } from '../utils';

type Item = { imdbId: string|null; title: string; genres: string[]; releaseDate: string|null; budget: {raw:number|null; usd:string|null} };
type Resp = { page:number; perPage:number; total:number; items: Item[] };

export default function YearPage(){
  const { year = '1999' } = useParams();
  const [data, setData] = React.useState<Resp|null>(null);
  const [page, setPage] = React.useState(1);
  const [order, setOrder] = React.useState<'asc'|'desc'>('asc');

  React.useEffect(()=>{
    api<Resp>(`/movies/year/${year}?page=${page}&order=${order}`).then(setData).catch(console.error);
  },[year, page, order]);

  if(!data) return <div>Loading…</div>;
  return (
    <div>
      <h2>Movies in {year}</h2>
      <div style={{display:'flex', gap:8, alignItems:'center'}}>
        Sort: 
        <select value={order} onChange={e=>setOrder(e.target.value as any)}>
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </div>
      <Pager page={data.page} perPage={data.perPage} total={data.total} onPage={setPage}/>
      <ul>
        {data.items.map((m, i)=> <li key={i}>{m.releaseDate} — {m.title}</li>)}
      </ul>
    </div>
  );
}

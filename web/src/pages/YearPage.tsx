import React from 'react';
import { useParams } from 'react-router-dom';
import { api, Pager } from '../utils';

type Item = { imdbId: string|null; title: string; genres: string[]; releaseDate: string|null; budget: {raw:number|null; usd:string|null} };
type Resp = { page:number; perPage:number; total:number; items: Item[] };

export default function YearPage(){
  const { year = '2020' } = useParams();
  const [data, setData] = React.useState<Resp|null>(null);
  const [page, setPage] = React.useState(1);
  const [order, setOrder] = React.useState<'asc'|'desc'>('asc');
  const [error, setError] = React.useState<string|null>(null);

  React.useEffect(()=>{
    setData(null);
    setError(null);
    api<Resp>(`/movies/year/${year}?page=${page}&order=${order}`)
      .then(setData)
      .catch(err => {
        console.error(err);
        setError('Failed to load movies. Please try again.');
      });
  },[year, page, order]);

  if(error) return <div style={{color: 'red', padding: 20}}>{error}</div>;
  if(!data) return <div>Loading {year} movies…</div>;

  return (
    <div>
      <h2>Movies in {year}</h2>
      <p style={{color: '#666'}}>Found {data.total} movies from this year</p>
      <div style={{display:'flex', gap:8, alignItems:'center', marginBottom: 12}}>
        Sort:
        <select value={order} onChange={e=>setOrder(e.target.value as any)}>
          <option value="asc">Ascending (by date)</option>
          <option value="desc">Descending (by date)</option>
        </select>
      </div>
      <Pager page={data.page} perPage={data.perPage} total={data.total} onPage={setPage}/>
      <ul>
        {data.items.map((m, i)=> <li key={i}>{m.releaseDate} — {m.title}</li>)}
      </ul>
    </div>
  );
}

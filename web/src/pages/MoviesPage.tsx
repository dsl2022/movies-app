import React from 'react';
import { api, Pager } from '../utils';
import { Link } from 'react-router-dom';

type Item = { imdbId: string|null; title: string; genres: string[]; releaseDate: string|null; budget: {raw:number|null; usd:string|null} };
type Resp = { page:number; perPage:number; total:number; items: Item[] };

export default function MoviesPage(){
  const [data, setData] = React.useState<Resp|null>(null);
  const [page, setPage] = React.useState(1);
  React.useEffect(()=>{ api<Resp>(`/movies?page=${page}`).then(setData).catch(console.error); },[page]);
  if(!data) return <div>Loading…</div>;
  return (
    <div>
      <h2>All Movies</h2>
      <Pager page={data.page} perPage={data.perPage} total={data.total} onPage={setPage}/>
      <table width="100%" cellPadding={8} style={{borderCollapse:'collapse'}}>
        <thead><tr><th>IMDB</th><th>Title</th><th>Genres</th><th>Release</th><th>Budget</th></tr></thead>
        <tbody>
          {data.items.map((m, i)=> (
            <tr key={i} style={{borderTop:'1px solid #ddd'}}>
              <td>{m.imdbId}</td>
              <td><Link to={`/movies/${m.imdbId}`}>{m.title}</Link></td>
              <td>{m.genres.join(', ')}</td>
              <td>{m.releaseDate}</td>
              <td>{m.budget.usd ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, Pager } from '../utils';

type Item = { imdbId: string|null; title: string; genres: string[]; releaseDate: string|null; budget: {raw:number|null; usd:string|null} };
type Resp = { page:number; perPage:number; total:number; items: Item[] };

export default function GenrePage(){
  const { genre = 'Action' } = useParams();
  const [data, setData] = React.useState<Resp|null>(null);
  const [page, setPage] = React.useState(1);
  const [error, setError] = React.useState<string|null>(null);

  React.useEffect(() => {
    setData(null);
    setError(null);
    api<Resp>(`/movies/genre/${genre}?page=${page}`)
      .then(setData)
      .catch(err => {
        console.error(err);
        setError('Failed to load movies. Please try again.');
      });
  }, [genre, page]);

  if(error) return <div style={{color: 'red', padding: 20}}>{error}</div>;
  if(!data) return <div>Loading {genre} movies…</div>;

  return (
    <div>
      <h2>Genre: {genre}</h2>
      <p style={{color: '#666'}}>Found {data.total} movies in this genre</p>
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

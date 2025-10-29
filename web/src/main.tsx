import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom'
import MoviesPage from './pages/MoviesPage'
import YearPage from './pages/YearPage'
import GenrePage from './pages/GenrePage'
import MovieDetails from './pages/MovieDetails'

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Documentary', 'Drama',
  'Family', 'Foreign', 'History', 'Horror', 'Mystery', 'Romance',
  'Science Fiction', 'Thriller'
];

// Generate years from 1920 to current year
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1919 }, (_, i) => currentYear - i);

function GenreSelector() {
  const navigate = useNavigate();
  const [selectedGenre, setSelectedGenre] = React.useState('Action');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const genre = e.target.value;
    setSelectedGenre(genre);
    navigate(`/genre/${genre}`);
  };

  return (
    <select
      value={selectedGenre}
      onChange={handleChange}
      style={{
        padding: '6px 12px',
        fontSize: '14px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        cursor: 'pointer'
      }}
    >
      {GENRES.map(genre => (
        <option key={genre} value={genre}>{genre}</option>
      ))}
    </select>
  );
}

function YearSelector() {
  const navigate = useNavigate();
  const [selectedYear, setSelectedYear] = React.useState('2020');

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setSelectedYear(year);
    navigate(`/year/${year}`);
  };

  return (
    <select
      value={selectedYear}
      onChange={handleChange}
      style={{
        padding: '6px 12px',
        fontSize: '14px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        cursor: 'pointer'
      }}
    >
      {YEARS.map(year => (
        <option key={year} value={year}>{year}</option>
      ))}
    </select>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div style={{padding:16, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, Arial'}}>
        <header style={{display:'flex', gap:12, alignItems:'center', marginBottom: 20}}>
          <h1 style={{marginRight:16}}>🎬 Movies</h1>
          <Link to="/">All</Link>
          <span style={{display:'flex', alignItems:'center', gap:8}}>
            <span>By Genre:</span>
            <GenreSelector />
          </span>
          <span style={{display:'flex', alignItems:'center', gap:8}}>
            <span>By Year:</span>
            <YearSelector />
          </span>
        </header>
        <Routes>
          <Route path="/" element={<MoviesPage/>} />
          <Route path="/movies/:imdbId" element={<MovieDetails/>} />
          <Route path="/year/:year" element={<YearPage/>} />
          <Route path="/genre/:genre" element={<GenrePage/>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(<App/>)

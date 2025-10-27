import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import MoviesPage from './pages/MoviesPage'
import YearPage from './pages/YearPage'
import GenrePage from './pages/GenrePage'
import MovieDetails from './pages/MovieDetails'

function App() {
  return (
    <BrowserRouter>
      <div style={{padding:16, maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, Arial'}}>
        <header style={{display:'flex', gap:12, alignItems:'center'}}>
          <h1 style={{marginRight:16}}>🎬 Movies</h1>
          <Link to="/">All</Link>
          <Link to="/genre/Action">By Genre</Link>
          <Link to="/year/1999">By Year</Link>
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

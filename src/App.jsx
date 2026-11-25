import { useEffect, useRef, useState } from 'react';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { PlacesProvider, usePlaces } from './context/PlacesContext.jsx';
import Navbar from './components/Navbar.jsx';
import Login from './pages/Login.jsx';
import Import from './pages/Import.jsx';
import MapView from './pages/MapView.jsx';
import PlacesList from './pages/PlacesList.jsx';
import Settings from './pages/Settings.jsx';

function AppShell() {
  const { user, authLoading } = useAuth();
  const { places, loading: placesLoading, setViewMode } = usePlaces();
  const [activePage, setActivePage] = useState('map');
  const [focusedPlace, setFocusedPlace] = useState(null);
  const hasAutoRoutedRef = useRef(false);

  useEffect(() => {
    if (!user) {
      hasAutoRoutedRef.current = false;
      setActivePage('map');
      setFocusedPlace(null);
    }
  }, [user]);

  useEffect(() => {
    if (user && !placesLoading && !hasAutoRoutedRef.current) {
      hasAutoRoutedRef.current = true;
      if (places.length === 0) {
        setActivePage('import');
      } else {
        setActivePage('map');
      }
    }
  }, [user, placesLoading, places.length]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-parchment-50 dark:bg-moss-900">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-9 w-9 animate-pulse rounded-md border border-brass-500/40 bg-moss-900/20 dark:bg-parchment-200/20" />
          <p className="font-mono text-xs uppercase tracking-widest text-moss-700 dark:text-parchment-300">
            Loading Atlas...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-parchment-50 text-moss-900 dark:bg-moss-900 dark:text-parchment-200">
      <Navbar activePage={activePage} onNavigate={setActivePage} />

      {activePage === 'map' && (
        <MapView
          focusedPlace={focusedPlace}
          onGoToImport={() => setActivePage('import')}
        />
      )}
      {activePage === 'places' && (
        <PlacesList
          onViewOnMap={(place) => {
            setViewMode('pins');
            setFocusedPlace({ ...place, _ts: Date.now() });
            setActivePage('map');
          }}
          onGoToImport={() => setActivePage('import')}
        />
      )}
      {activePage === 'import' && (
        <Import onGoToMap={() => setActivePage('map')} />
      )}
      {activePage === 'settings' && <Settings />}
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlacesProvider>
          <AppShell />
        </PlacesProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

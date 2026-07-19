import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Resetea el scroll al TOP cada vez que cambia la ruta (pathname). En el BI el scroll NO es del window
// sino de un <div overflow-y-auto> propio de cada layout (MainLayout / ContaLayout), por eso el contenedor
// conservaba su scrollTop al navegar. Este hook devuelve el ref para engancharlo a ese contenedor.
export function useScrollTopOnNavigate<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);
  const { pathname } = useLocation();
  useEffect(() => {
    ref.current?.scrollTo({ top: 0, left: 0 });
  }, [pathname]);
  return ref;
}

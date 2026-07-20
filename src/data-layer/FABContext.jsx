import { createContext, useContext, useEffect, useRef } from 'react';

const FabActionContext = createContext();

export function FabActionProvider({ children }) {
  const fabActionRef = useRef(null);
  return (
    <FabActionContext.Provider value={fabActionRef}>
      {children}
    </FabActionContext.Provider>
  );
}

export function useFabAction(action) {
  const fabActionRef = useContext(FabActionContext);
  useEffect(() => {
    fabActionRef.current = typeof action === 'function' ? action : null;
    return () => { fabActionRef.current = null; };
  }, [action, fabActionRef]);
}

export { FabActionContext };

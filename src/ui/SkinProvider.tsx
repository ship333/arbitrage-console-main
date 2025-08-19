import { createContext, useContext, ReactNode } from 'react';

type Skin = 'classic' | 'lovable';

const SkinContext = createContext<Skin>('classic');

export const SkinProvider = ({ children }: { children: ReactNode }) => {
  const env = (import.meta as any)?.env || {};
  const skin = (env.VITE_FRONTEND_SKIN ?? env.NEXT_PUBLIC_FRONTEND_SKIN ?? 'classic') as Skin;
  
  return (
    <SkinContext.Provider value={skin}>
      {children}
    </SkinContext.Provider>
  );
};

export const useSkin = () => {
  return useContext(SkinContext);
};

export const withSkin = <P extends object>(
  Component: React.ComponentType<P>,
  { classic: ClassicComponent, lovable: LovableComponent }:
  { classic: React.ComponentType<P>, lovable: React.ComponentType<P> }
) => {
  return function WithSkin(props: P) {
    const skin = useSkin();
    const SkinComponent = skin === 'lovable' ? LovableComponent : ClassicComponent;
    return <SkinComponent {...props} />;
  };
};

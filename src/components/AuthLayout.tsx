import { ReactNode } from 'react';
import logoTrackImob from '../assets/trackimob-logo.svg';

type AuthLayoutProps = {
  children: ReactNode;
};

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main className="auth-layout">
      <section className="auth-shell">
        <img className="auth-logo" src={logoTrackImob} alt="TrackImob Pro" />
        {children}
      </section>
    </main>
  );
}

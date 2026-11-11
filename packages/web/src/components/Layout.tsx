import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function Layout() {
  const { user, logout } = useAuth();

  return (
    <>
      <div className="banner" role="note">
        Synthetic fixture data only. No employer affiliation. Replay is a local simulation (no outbound
        HTTP).
      </div>
      <div className="layout">
        <nav className="nav" aria-label="Main">
          <NavLink to="/" end>
            Overview
          </NavLink>
          <NavLink to="/deliveries">Deliveries</NavLink>
          <NavLink to="/dead-letters">Dead letters</NavLink>
          <NavLink to="/audit">Audit</NavLink>
          <span className="spacer" />
          <span aria-label="Signed in as">{user?.displayName}</span>
          <button type="button" className="secondary" onClick={() => void logout()}>
            Log out
          </button>
        </nav>
        <Outlet />
      </div>
    </>
  );
}

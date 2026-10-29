import { Link, NavLink } from 'react-router-dom';
import AIMenu from './AIMenu.jsx';
import Logo from './Logo.jsx';

export default function TopBar() {
  return (
    <header className="topbar">
      <Link to="/" className="brand" aria-label="שביל ישראל, דף הבית">
        <Logo />
        <span className="brand-name">שביל ישראל<small className="mono">אטלס חי</small></span>
      </Link>
      <nav className="nav" aria-label="ניווט ראשי">
        <NavLink to="/" end>השביל</NavLink>
        <NavLink to="/seasons">עונות<span className="nav-more"> וטבע</span></NavLink>
        <NavLink to="/plan">תכנון<span className="nav-more"> מסע</span></NavLink>
      </nav>
      <AIMenu />
    </header>
  );
}

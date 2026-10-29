import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import TopBar from './components/TopBar.jsx';
import Home from './pages/Home.jsx';
import SectionPage from './pages/SectionPage.jsx';
import SeasonsPage from './pages/SeasonsPage.jsx';
import PlanPage from './pages/PlanPage.jsx';

export default function App() {
  const loc = useLocation();
  return (
    <>
      <TopBar />
      <AnimatePresence mode="wait">
        <motion.div key={loc.pathname.split('/')[1] || 'home'} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route path="/s/:n" element={<SectionPage />} />
            <Route path="/seasons" element={<SeasonsPage />} />
            <Route path="/plan" element={<PlanPage />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </motion.div>
      </AnimatePresence>
    </>
  );
}

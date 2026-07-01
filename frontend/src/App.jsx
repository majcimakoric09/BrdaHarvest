import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import HarvestPrediction from './pages/HarvestPrediction.jsx'
import ClimateTrends from './pages/ClimateTrends.jsx'
import ModelPerformance from './pages/ModelPerformance.jsx'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/predict" element={<HarvestPrediction />} />
        <Route path="/climate" element={<ClimateTrends />} />
        <Route path="/performance" element={<ModelPerformance />} />
      </Routes>
    </Layout>
  )
}

export default App

import { useState, useEffect } from 'react';
import { dashboardAPI, alertasAPI } from '../services/api';
import Layout from '../components/Layout';
import DashboardHome from '../components/sections/DashboardHome';
import Vehiculos from '../components/sections/Vehiculos';
import Choferes from '../components/sections/Choferes';
import Rutas from '../components/sections/Rutas';
import Viajes from '../components/sections/Viajes';
import Mantenimiento from '../components/sections/Mantenimiento';
import Alertas from '../components/sections/Alertas';
import Reportes from '../components/sections/Reportes';

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState('dashboard');

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <DashboardHome />;
      case 'vehiculos':
        return <Vehiculos />;
      case 'choferes':
        return <Choferes />;
      case 'rutas':
        return <Rutas />;
      case 'viajes':
        return <Viajes />;
      case 'mantenimiento':
        return <Mantenimiento />;
      case 'alertas':
        return <Alertas />;
      case 'reportes':
        return <Reportes />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <Layout activeSection={activeSection} setActiveSection={setActiveSection}>
      {renderSection()}
    </Layout>
  );
}
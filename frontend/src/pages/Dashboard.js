import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Dashboard = () => {
  const [stats, setStats] = useState({});
  const [recentTrips, setRecentTrips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, tripsRes, alertsRes] = await Promise.all([
        api.get('/dashboard/estadisticas'),
        api.get('/dashboard/viajes-recientes'),
        api.get('/alertas')
      ]);

      setStats(statsRes.data);
      setRecentTrips(tripsRes.data);
      setAlerts(alertsRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando dashboard...</div>;
  }

  return (
    <div className="dashboard">
      <h1>📊 Dashboard</h1>
      
      {/* Estadísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>🚗 Vehículos</h3>
          <p className="stat-number">{stats.totalVehiculos}</p>
          <p className="stat-subtitle">{stats.vehiculosDisponibles} disponibles</p>
        </div>
        
        <div className="stat-card">
          <h3>👨‍✈️ Choferes</h3>
          <p className="stat-number">{stats.choferesActivos}</p>
          <p className="stat-subtitle">activos</p>
        </div>
        
        <div className="stat-card">
          <h3>🛣️ Viajes Hoy</h3>
          <p className="stat-number">{stats.viajesHoy}</p>
          <p className="stat-subtitle">{stats.viajesEnCurso} en curso</p>
        </div>
        
        <div className="stat-card">
          <h3>⚠️ Alertas</h3>
          <p className="stat-number">{stats.alertasActivas}</p>
          <p className="stat-subtitle">activas</p>
        </div>
      </div>

      {/* Alertas */}
      <div className="dashboard-section">
        <h2>🔔 Alertas Recientes</h2>
        {alerts.length > 0 ? (
          <div className="alerts-list">
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.idAlerta} className={`alert-item ${alert.prioridad?.toLowerCase()}`}>
                <span className="alert-message">{alert.mensaje}</span>
                <span className="alert-date">
                  {new Date(alert.fechaCreacion).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p>No hay alertas activas</p>
        )}
      </div>

      {/* Viajes Recientes */}
      <div className="dashboard-section">
        <h2>🚚 Viajes Recientes</h2>
        {recentTrips.length > 0 ? (
          <div className="trips-list">
            {recentTrips.map(trip => (
              <div key={trip.idViaje} className="trip-item">
                <div className="trip-route">
                  <strong>{trip.origen} → {trip.destino}</strong>
                </div>
                <div className="trip-info">
                  <span>Vehículo: {trip.placa}</span>
                  <span>Chofer: {trip.choferNombre}</span>
                  <span className={`status ${trip.estado?.toLowerCase()}`}>
                    {trip.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p>No hay viajes recientes</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
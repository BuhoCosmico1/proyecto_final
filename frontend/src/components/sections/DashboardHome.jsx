import { useState, useEffect } from 'react';
import { dashboardAPI, alertasAPI } from '../../services/api';
import { Truck, Users, MapPin, Bell, TrendingUp, Activity, DollarSign } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardHome() {
  const [kpis, setKpis] = useState({});
  const [alertas, setAlertas] = useState([]);
  const [vehiculosMasUsados, setVehiculosMasUsados] = useState([]);
  const [viajesPorDia, setViajesPorDia] = useState([]);
  const [loading, setLoading] = useState(true);

  // =====================================
  // CARGA DE DATOS
  // =====================================
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [kpisRes, alertasRes, vehiculosRes, viajesRes] = await Promise.all([
        dashboardAPI.getKPIs(),
        alertasAPI.getActivas(),
        dashboardAPI.getVehiculosMasUsados(30),
        dashboardAPI.getViajesPorDia(7)
      ]);

      // 🔧 Normalizar KPIs
      const normalizar = (data) => {
        const k = { ...data };
        Object.keys(k).forEach((key) => {
          if (k[key] === null) k[key] = 0;
          if (!isNaN(k[key])) k[key] = Number(k[key]);
        });
        return k;
      };

      setKpis(normalizar(kpisRes.data));

      // 🔧 Normalizar vehículos
      setVehiculosMasUsados(
        vehiculosRes.data.map(v => ({
          ...v,
          totalViajes: Number(v.totalViajes || 0),
          combustibleTotal: Number(v.combustibleTotal || 0),
          tiempoPromedioHoras: Number(v.tiempoPromedioHoras || 0)
        }))
      );

      // 🔧 Normalizar viajes por día
      setViajesPorDia(
        viajesRes.data.map(v => ({
          ...v,
          completados: Number(v.completados || 0),
          enCurso: Number(v.enCurso || 0),
          cancelados: Number(v.cancelados || 0),
        }))
      );

      setAlertas(alertasRes.data);

    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // =====================================
  // LOADING STATE — Skeleton Pro
  // =====================================
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map((i) => (
            <div key={i} className="bg-gray-200 h-32 rounded-xl shadow-sm"></div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-200 h-64 rounded-xl shadow-sm"></div>
          <div className="bg-gray-200 h-64 rounded-xl shadow-sm"></div>
        </div>
      </div>
    );
  }

  // =====================================
  // UI DEL DASHBOARD
  // =====================================
  return (
    <div className="space-y-6">

      {/* =============================== */}
      {/* KPIs */}
      {/* =============================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* Vehículos disponibles */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 p-3 rounded-lg">
              <Truck className="text-green-600" size={24} />
            </div>
            <TrendingUp className="text-green-600" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-gray-800">{kpis.vehiculosDisponibles}</h3>
          <p className="text-sm text-gray-600">Vehículos Disponibles</p>
          <p className="text-xs text-gray-400 mt-1">De {kpis.totalVehiculos}</p>
        </div>

        {/* Choferes activos */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
            <Activity className="text-blue-600" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-gray-800">{kpis.choferesActivos}</h3>
          <p className="text-sm text-gray-600">Choferes Activos</p>
        </div>

        {/* Viajes hoy */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-100 p3 rounded-lg p-3">
              <MapPin className="text-purple-600" size={24} />
            </div>
            <Activity className="text-purple-600" size={20} />
          </div>
          <h3 className="text-3xl font-bold text-gray-800">{kpis.viajesCompletadosHoy}</h3>
          <p className="text-sm text-gray-600">Viajes Hoy</p>
          <p className="text-xs text-gray-400 mt-1">{kpis.viajesEnCurso} en curso</p>
        </div>

        {/* Alertas activas */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-100 p-3 rounded-lg">
              <Bell className="text-red-600" size={24} />
            </div>
            <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded font-semibold">
              Urgente
            </span>
          </div>
          <h3 className="text-3xl font-bold text-gray-800">{kpis.alertasActivas}</h3>
          <p className="text-sm text-gray-600">Alertas Activas</p>
        </div>

      </div>

      {/* =============================== */}
      {/* GRÁFICAS */}
      {/* =============================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Vehículos más usados */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Vehículos Más Utilizados</h3>

          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={vehiculosMasUsados.slice(0, 5)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="placa" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="totalViajes" fill="#4F46E5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Últimos 7 días */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Viajes Últimos 7 Días</h3>

          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={viajesPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dia" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line 
                type="monotone"
                dataKey="completados"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* =============================== */}
      {/* ALERTAS */}
      {/* =============================== */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="text-red-500" size={22} />
            <h2 className="text-xl font-bold text-gray-800">Alertas Activas</h2>
          </div>

          <div className="space-y-3">
            {alertas.slice(0, 5).map((alerta) => (
              <div
                key={alerta.idAlerta}
                className={`p-4 rounded-lg border-l-4 ${
                  alerta.prioridad === 'Alta'
                    ? 'bg-red-50 border-red-600'
                    : alerta.prioridad === 'Media'
                    ? 'bg-yellow-50 border-yellow-500'
                    : 'bg-blue-50 border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded ${
                        alerta.prioridad === 'Alta'
                          ? 'bg-red-100 text-red-700'
                          : alerta.prioridad === 'Media'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {alerta.tipo}
                    </span>
                    <p className="text-sm font-medium text-gray-700 mt-1">{alerta.mensaje}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(alerta.fechaCreacion).toLocaleString('es-ES')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =============================== */}
      {/* INFO EXTRA */}
      {/* =============================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={24} />
            <h4 className="font-semibold">Costo Mantenimiento</h4>
          </div>
          <p className="text-3xl font-bold">
            ${Number(kpis.costoMantenimientoMes || 0).toFixed(2)}
          </p>
          <p className="text-sm opacity-80 mt-1">Este mes</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Truck size={24} />
            <h4 className="font-semibold">En Mantenimiento</h4>
          </div>
          <p className="text-3xl font-bold">{kpis.vehiculosMantenimiento}</p>
          <p className="text-sm opacity-80 mt-1">Vehículos</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl shadow p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <MapPin size={24} />
            <h4 className="font-semibold">En Uso</h4>
          </div>
          <p className="text-3xl font-bold">{kpis.vehiculosEnUso}</p>
          <p className="text-sm opacity-80 mt-1">Vehículos activos</p>
        </div>

      </div>
    </div>
  );
}

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Truck, Users, MapPin, Calendar, Wrench, Bell, 
  BarChart3, LogOut, Menu, X, Home 
} from 'lucide-react';

export default function Layout({ children, activeSection, setActiveSection }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, roles: ['Administrador', 'Supervisor'] },
    { id: 'vehiculos', label: 'Vehículos', icon: Truck, roles: ['Administrador', 'Supervisor'] },
    { id: 'choferes', label: 'Choferes', icon: Users, roles: ['Administrador', 'Supervisor'] },
    { id: 'rutas', label: 'Rutas', icon: MapPin, roles: ['Administrador', 'Supervisor'] },
    { id: 'viajes', label: 'Viajes', icon: Calendar, roles: ['Administrador', 'Supervisor', 'Chofer'] },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: Wrench, roles: ['Administrador', 'Supervisor'] },
    { id: 'alertas', label: 'Alertas', icon: Bell, roles: ['Administrador', 'Supervisor'] },
    { id: 'reportes', label: 'Reportes', icon: BarChart3, roles: ['Administrador', 'Supervisor'] },
  ];

  const filteredMenuItems = menuItems.filter(item => 
    item.roles.includes(user?.rol)
  );

  const handleLogout = () => {
    if (window.confirm('¿Seguro que quieres cerrar sesión?')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`bg-indigo-900 text-white transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-indigo-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-700 p-2 rounded-lg">
                <Truck size={24} />
              </div>
              {sidebarOpen && (
                <div>
                  <h1 className="font-bold text-lg">Logística</h1>
                  <p className="text-xs text-indigo-300">Sistema</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-indigo-800 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-indigo-700 text-white'
                        : 'text-indigo-100 hover:bg-indigo-800'
                    }`}
                  >
                    <Icon size={20} />
                    {sidebarOpen && <span className="font-medium">{item.label}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-indigo-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-indigo-700 p-2 rounded-full">
              <Users size={20} />
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="text-sm font-medium">{user?.nombre}</p>
                <p className="text-xs text-indigo-300">{user?.rol}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            {sidebarOpen && <span className="text-sm font-medium">Cerrar Sesión</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 capitalize">
                {activeSection}
              </h2>
              <p className="text-sm text-gray-600">
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{user?.email}</p>
                <p className="text-xs text-gray-500">Sesión activa</p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
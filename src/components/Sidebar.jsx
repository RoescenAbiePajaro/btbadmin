import React from 'react';
import { FiLogOut, FiUsers, FiBarChart2, FiKey, FiX } from 'react-icons/fi';

export default function Sidebar({ 
  isSidebarOpen, 
  setIsSidebarOpen, 
  activeNav, 
  handleNavClick, 
  userData, 
  handleLogout,
  isMobile 
}) {
  return (
    <>
      {/* Mobile Overlay */}
      {isSidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-gray-900 shadow-lg flex flex-col border-r border-gray-800
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <FiX size={24} />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 pt-6 md:pt-4">
          <button 
            onClick={() => handleNavClick('analytics')}
            className={`flex items-center w-full p-3 rounded-lg transition-colors ${
              activeNav === 'analytics' 
                ? 'bg-blue-900 bg-opacity-50 text-blue-300 border border-blue-700' 
                : 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
            }`}
          >
            <FiBarChart2 className="mr-3" />
            <span>Analytics</span>
          </button>
          <button 
            onClick={() => handleNavClick('guests')}
            className={`flex items-center w-full p-3 rounded-lg transition-colors ${
              activeNav === 'guests' 
                ? 'bg-blue-900 bg-opacity-50 text-blue-300 border border-blue-700' 
                : 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
            }`}
          >
            <FiUsers className="mr-3" />
            <span>Guest Activity</span>
          </button>
          <button 
            onClick={() => handleNavClick('access-codes')}
            className={`flex items-center w-full p-3 rounded-lg transition-colors ${
              activeNav === 'access-codes' 
                ? 'bg-blue-900 bg-opacity-50 text-blue-300 border border-blue-700' 
                : 'hover:bg-gray-800 text-gray-400 hover:text-gray-300'
            }`}
          >
            <FiKey className="mr-3" />
            <span>Access Codes</span>
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center p-3 bg-gray-800 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-900 bg-opacity-50 flex items-center justify-center text-blue-300 font-semibold border border-blue-700">
              {userData?.username?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="ml-3 flex flex-col">
              <p className="text-sm font-medium text-white">{userData?.username || 'Admin'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Administrator</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white font-semibold text-sm mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 hover:bg-red-700 rounded-lg transition-colors"
          >
            <FiLogOut size={16} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

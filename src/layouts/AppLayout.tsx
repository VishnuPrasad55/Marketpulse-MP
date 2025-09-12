import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useAppContext } from '../context/AppContext';

export const AppLayout: React.FC = () => {
  const { isDarkMode } = useAppContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Navbar />
      <div className="flex flex-1 relative">
        <div
          className="h-full"
          onMouseEnter={() => setIsSidebarOpen(true)}
          onMouseLeave={() => setIsSidebarOpen(false)}
        >
          <Sidebar isOpen={isSidebarOpen} />
        </div>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, logout, isadmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-800 text-white p-4">
      <div className="max-w-md mx-auto bg-gray-700 rounded-lg p-6 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Twój Profil</h1>
        {isadmin && (
          <div className="text-center text-yellow-500 font-bold mb-4">Admin</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nazwa użytkownika</label>
            <div className="w-full p-2 rounded bg-gray-600 text-white">
              {user?.nick || "Nie ustawiono"}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <div className="w-full p-2 rounded bg-gray-600 text-white">
              {user?.email}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
            >
              Wyloguj się
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
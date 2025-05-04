import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Logging in with:", { email, password });
    // Dodaj logikę logowania, np. wywołanie API
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800 text-white p-4">
      {/* Przycisk Wróć w lewym górnym rogu */}
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 p-2 bg-gray-700 rounded hover:bg-gray-600 transition"
      >
        Wróć
      </button>

      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold mb-4 text-center">Logowanie</h2>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Adres e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="password"
            placeholder="Hasło"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <button
            type="submit"
            className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Zaloguj się
          </button>
          
          <Link 
            to="/register" 
            className="p-2 bg-white text-gray-800 text-center rounded hover:bg-gray-200 transition"
          >
            Zarejestruj się
          </Link>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
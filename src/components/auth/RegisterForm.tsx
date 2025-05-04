import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await axios.post("/api/auth/register", formData);
      
      if (response.data.success) {
        // Rejestracja udana - przekieruj do logowania
        navigate("/login", { state: { registrationSuccess: true } });
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        // Błędy walidacji z backendu
        setErrors(error.response.data.errors);
      } else {
        // Inne błędy
        setErrors({ general: error.response?.data?.message || "Wystąpił błąd podczas rejestracji" });
      }
    } finally {
      setIsSubmitting(false);
    }
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
      
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Rejestracja</h2>
        
        {errors.general && (
          <div className="mb-4 p-2 bg-red-500 text-white rounded text-center">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                name="firstName"
                placeholder="Imię"
                value={formData.firstName}
                onChange={handleChange}
                className={`w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                  errors.firstName ? "focus:ring-red-500" : "focus:ring-blue-500"
                }`}
                required
              />
              {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
            </div>
            
            <div>
              <input
                type="text"
                name="lastName"
                placeholder="Nazwisko"
                value={formData.lastName}
                onChange={handleChange}
                className={`w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                  errors.lastName ? "focus:ring-red-500" : "focus:ring-blue-500"
                }`}
                required
              />
              {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div>
            <input
              type="text"
              name="username"
              placeholder="Nazwa użytkownika"
              value={formData.username}
              onChange={handleChange}
              className={`w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                errors.username ? "focus:ring-red-500" : "focus:ring-blue-500"
              }`}
              required
            />
            {errors.username && <p className="text-red-500 text-sm mt-1">{errors.username}</p>}
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Adres e-mail"
              value={formData.email}
              onChange={handleChange}
              className={`w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                errors.email ? "focus:ring-red-500" : "focus:ring-blue-500"
              }`}
              required
            />
            {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Hasło"
              value={formData.password}
              onChange={handleChange}
              className={`w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                errors.password ? "focus:ring-red-500" : "focus:ring-blue-500"
              }`}
              required
              minLength={6}
            />
            {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`p-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition ${
              isSubmitting ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? "Rejestrowanie..." : "Zarejestruj się"}
          </button>
          
          <div className="text-center mt-4">
            <span className="text-gray-400">Masz już konto? </span>
            <Link 
              to="/login" 
              className="text-blue-400 hover:text-blue-300"
            >
              Zaloguj się
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;
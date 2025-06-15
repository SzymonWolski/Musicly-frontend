import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

interface RegisterFormData {
  nick: string;
  email: string;
  password: string;
}

interface BackendErrors {
  nick?: string;
  email?: string;
  [key: string]: string | undefined;
}

const RegisterForm = () => {
  const [formData, setFormData] = useState<RegisterFormData>({
    nick: "",
    email: "",
    password: ""
  });
  const [errors, setErrors] = useState<BackendErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
      const response = await axios.post("http://localhost:5000/auth/register", formData, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        navigate("/login", { 
          state: { 
            registrationSuccess: true,
            message: "Rejestracja zakończona sukcesem! Możesz się teraz zalogować."
          } 
        });
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ 
          general: error.response?.data?.message || 
                  "Wystąpił błąd podczas rejestracji. Spróbuj ponownie później." 
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-800 text-white p-4 relative">
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 p-2 bg-gray-700 rounded hover:bg-gray-600 transition flex items-center text-white"
      >
        <ArrowLeft className="size-5 mr-2" />
        <span className="hidden md:inline">Wróć</span>
      </button>
      
      <div className="w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-center">Rejestracja</h2>
        
        {errors.general && (
          <div className="mb-4 p-2 bg-red-500 text-white rounded text-center">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <input
              type="text"
              name="nick"
              placeholder="Nazwa użytkownika"
              value={formData.nick}
              onChange={handleChange}
              maxLength={50}
              className={`w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                errors.nick ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
              }`}
              required
            />
            {formData.nick.length > 0 && (
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${
                  formData.nick.length > 40 ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {formData.nick.length}/50
                </span>
              </div>
            )}
            {errors.nick && (
              <p className="text-red-500 text-sm mt-1">{errors.nick}</p>
            )}
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Adres e-mail"
              value={formData.email}
              onChange={handleChange}
              maxLength={100}
              className={`w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                errors.email ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
              }`}
              required
            />
            {formData.email.length > 0 && (
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${
                  formData.email.length > 80 ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {formData.email.length}/100
                </span>
              </div>
            )}
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <input
              type="password"
              name="password"
              placeholder="Hasło (min. 6 znaków)"
              value={formData.password}
              onChange={handleChange}
              minLength={6}
              maxLength={100}
              className={`w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 ${
                errors.password ? "focus:ring-red-500 border-red-500" : "focus:ring-blue-500"
              }`}
              required
            />
            {formData.password.length > 0 && (
              <div className="flex justify-end mt-1">
                <span className={`text-xs ${
                  formData.password.length > 80 ? 'text-yellow-400' : 'text-gray-400'
                }`}>
                  {formData.password.length}/100
                </span>
              </div>
            )}
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition ${
              isSubmitting ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Rejestrowanie...
              </span>
            ) : "Zarejestruj się"}
          </button>
          
          <div className="text-center mt-2">
            <span className="text-gray-400">Masz już konto? </span>
            <Link 
              to="/login" 
              className="text-blue-400 hover:text-blue-300 font-medium"
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
import { useAuth } from "../context/AuthContext";

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div>
      <h1>Witaj, {user?.email}!</h1>
      <button onClick={logout} className="bg-red-500 text-white p-2 rounded">
        Wyloguj się
      </button>
    </div>
  );
};

export default Dashboard;
import { Route, Routes } from "react-router-dom";
import MainLayout from "./layout/MainLayout";
import HomePage from "./pages/home/HomePage";
import AlbumStrona from "./pages/album/AlbumStrona";
import LoginForm from "./components/auth/LoginForm";

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
      </Route>
      <Route path="/login" element={<LoginForm />} />
    </Routes>
  );
}

export default App;

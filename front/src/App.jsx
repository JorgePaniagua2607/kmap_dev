import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Profile from './pages/Profile.jsx';
import StudentHome from './pages/StudentHome.jsx';
import StudentSubject from './pages/StudentSubject.jsx';
import StudentTopic from './pages/StudentTopic.jsx';
import Quiz from './pages/Quiz.jsx';
import TeacherHome from './pages/TeacherHome.jsx';
import TeacherSubject from './pages/TeacherSubject.jsx';
import AdminHome from './pages/AdminHome.jsx';

export default function App() {
  const { user } = useAuth();

  return (
    <>
      {/* Luces ambientales de fondo */}
      <div className="aurora-top-left" aria-hidden="true" />
      <div className="aurora-bottom-right" aria-hidden="true" />

      {!user ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <Routes>
          <Route element={<Layout />}>
            {user.role === 'estudiante' && (
              <>
                <Route index element={<StudentHome />} />
                <Route path="materia/:id" element={<StudentSubject />} />
                <Route path="materia/:id/tema/:tid" element={<StudentTopic />} />
                <Route path="materia/:id/tema/:tid/quiz" element={<Quiz />} />
              </>
            )}
            
            {user.role === 'docente' && (
              <>
                <Route index element={<TeacherHome />} />
                <Route path="materia/:id" element={<TeacherSubject />} />
              </>
            )}
            
            {user.role === 'admin' && (
              <Route index element={<AdminHome />} />
            )}
            
            <Route path="perfil" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </>
  );
}
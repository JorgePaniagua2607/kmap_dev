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
import StudentSecurityGuard from './components/StudentSecurityGuard.jsx';

export default function App() {
  const { user } = useAuth();
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  return (
    <>
      <StudentSecurityGuard active={user.role === 'estudiante'} />
      <Routes>
        <Route element={<Layout />}>
          {user.role === 'estudiante' && (<>
            <Route index element={<StudentHome />} />
            <Route path="materia/:id" element={<StudentSubject />} />
            <Route path="materia/:id/tema/:tid" element={<StudentTopic />} />
            <Route path="materia/:id/tema/:tid/quiz" element={<Quiz />} />
          </>)}
          {user.role === 'docente' && (<>
            <Route index element={<TeacherHome />} />
            <Route path="materia/:id" element={<TeacherSubject />} />
          </>)}
          {user.role === 'admin' && <Route index element={<AdminHome />} />}
          <Route path="perfil" element={<Profile />} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

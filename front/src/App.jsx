import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Student from './pages/Student.jsx';
import Quiz from './pages/Quiz.jsx';
import Heatmap from './pages/Heatmap.jsx';
import Editor from './pages/Editor.jsx';
import Questions from './pages/Questions.jsx';

export default function App() {
  const { user } = useAuth();
  if (!user) return <Routes><Route path="*" element={<Login />} /></Routes>;
  const docente = user.role === 'docente';
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={docente ? <Heatmap /> : <Student />} />
        {docente ? (
          <>
            <Route path="editor" element={<Editor />} />
            <Route path="preguntas" element={<Questions />} />
          </>
        ) : (
          <Route path="quiz" element={<Quiz />} />
        )}
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

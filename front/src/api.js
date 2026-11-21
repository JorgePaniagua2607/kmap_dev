import { mockBackend } from './mockService.js';

// Cliente de API autónomo (Frontend Standalone - sin backend ni base de datos)
export async function api(path, { method = 'GET', body } = {}) {
  // Simulación de latencia mínima para fluidez de UI
  await new Promise((r) => setTimeout(r, 60));

  const user = JSON.parse(localStorage.getItem('user') || 'null');

  // Enrutamiento mock
  if (path === '/auth/login' && method === 'POST') {
    return mockBackend.login(body);
  }
  if (path === '/auth/register' && method === 'POST') {
    return mockBackend.register(body);
  }
  if (path === '/subjects' && method === 'GET') {
    return mockBackend.getSubjects();
  }
  if (path === '/subjects' && method === 'POST') {
    return mockBackend.createSubject(body, user);
  }

  // /subjects/:id/graph
  const graphMatch = path.match(/^\/subjects\/(\d+)\/graph$/);
  if (graphMatch && method === 'GET') {
    return mockBackend.getGraph(graphMatch[1], user);
  }
  if (graphMatch && method === 'PUT') {
    return mockBackend.saveGraph(graphMatch[1], body);
  }

  // /subjects/:id/diagnosis
  const diagMatch = path.match(/^\/subjects\/(\d+)\/diagnosis$/);
  if (diagMatch && method === 'GET') {
    return mockBackend.getDiagnosis(diagMatch[1], user);
  }

  // /subjects/:id/heatmap
  const heatmapMatch = path.match(/^\/subjects\/(\d+)\/heatmap$/);
  if (heatmapMatch && method === 'GET') {
    return mockBackend.getHeatmap(heatmapMatch[1]);
  }

  // /topics/:id/questions
  const topicQuestionsMatch = path.match(/^\/topics\/(\d+)\/questions$/);
  if (topicQuestionsMatch && method === 'GET') {
    return mockBackend.getQuestions(topicQuestionsMatch[1]);
  }
  if (topicQuestionsMatch && method === 'POST') {
    return mockBackend.createQuestion(topicQuestionsMatch[1], body);
  }

  // /questions/:id
  const questionDelMatch = path.match(/^\/questions\/(\d+)$/);
  if (questionDelMatch && method === 'DELETE') {
    return mockBackend.deleteQuestion(questionDelMatch[1]);
  }

  // /quiz/start
  if (path === '/quiz/start' && method === 'POST') {
    return mockBackend.startQuiz(body);
  }

  // /quiz/:id/answer
  const quizAnswerMatch = path.match(/^\/quiz\/([^/]+)\/answer$/);
  if (quizAnswerMatch && method === 'POST') {
    return mockBackend.answerQuiz(quizAnswerMatch[1], body, user);
  }

  throw new Error(`Ruta ${method} ${path} no encontrada`);
}

// Formato de fecha estándar dd/mm/yyyy
export const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '';
  const day = String(x.getDate()).padStart(2, '0');
  const month = String(x.getMonth() + 1).padStart(2, '0');
  const year = x.getFullYear();
  return `${day}/${month}/${year}`;
};

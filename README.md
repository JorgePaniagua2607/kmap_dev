# BIT ACADEMY

## 1. Introducción

**BIT ACADEMY** es una plataforma web educativa que organiza los contenidos de cada materia mediante grafos de conocimiento. A diferencia de una estructura lineal, los grafos permiten que el docente represente los temas en un grafo y defina entre ellos las relaciones y los prerrequisitos que considere necesarios.

Los docentes construyen el grafo de su materia, complementan cada tema con descripciones y materiales, y crean evaluaciones, ya sea manualmente o con ayuda de **BITSIBOOT**, el asistente inteligente de la plataforma. Los estudiantes se inscriben con un código, recorren el grafo, realizan las evaluaciones y reciben su calificación con una breve explicación. Con los resultados, el docente consulta estadísticas por nodo para identificar los temas con mayor y menor aprobación.

---

## 2. Objetivos

### 2.1. Objetivo general
Desarrollar una plataforma web educativa que modele cada materia como un grafo de prerrequisitos, identifique el tema raíz donde se originan las dificultades de aprendizaje mediante evaluaciones, recomendando rutas de recuperación personalizadas. Asimismo, integrar el asistente inteligente **BITSIBOOT** como herramienta de apoyo para el análisis del rendimiento académico, la identificación de áreas que requieren refuerzo y la generación de formularios y evaluaciones.

### 2.2. Objetivos específicos
* Implementar un sistema de administración de usuarios con diferentes roles y permisos.
* Desarrollar un editor gráfico que facilite la creación y organización de grafos de conocimiento.
* Representar los temas de cada materia mediante nodos y establecer sus relaciones de prerrequisitos.
* Incorporar herramientas para registrar descripciones y materiales educativos.
* Implementar evaluaciones que permitan conocer el nivel de dominio de los estudiantes en cada tema.
* Desarrollar un mecanismo de diagnóstico que recorra el grafo hacia atrás para identificar el tema raíz asociado a las dificultades de aprendizaje.
* Generar rutas de recuperación personalizadas, paso a paso, según los resultados obtenidos.
* Desarrollar una visualización interactiva del grafo que muestre mediante colores el nivel de dominio y resalte la ruta de recuperación.
* Incorporar un mapa de calor del grupo sobre el grafo, que permita visualizar el rendimiento académico de los estudiantes.
* Integrar **BITSIBOOT** para brindar asistencia a estudiantes y docentes mediante el análisis de información y la generación de formularios y evaluaciones.

---

## 3. Justificación

Los contenidos de una materia están relacionados entre sí: algunos temas requieren conocimientos previos y otros se desarrollan de forma complementaria. Una secuencia lineal no siempre representa esta estructura. Los grafos de conocimiento permiten al docente mostrar esas relaciones de forma explícita.

Además, comprobar la comprensión de los estudiantes requiere evaluaciones y datos que indiquen en qué temas rinden mejor o peor. **BITSIBOOT** apoya al docente en la elaboración de evaluaciones a partir de sus propios contenidos, como complemento a la creación manual.

---

## 4. Alcance del sistema

El sistema es una plataforma web con tres roles: **administrador**, **docente** y **estudiante**. Comprende la gestión de docentes y materias, la construcción y edición de grafos, la incorporación de recursos educativos, la creación y realización de evaluaciones, la asistencia de **BITSIBOOT** y la consulta de estadísticas académicas. Cualquier funcionalidad adicional se considerará en futuras versiones.

---

## 5. Roles del sistema

Cada tipo de usuario tiene responsabilidades diferenciadas dentro de la plataforma.

| Rol | Funciones principales |
| :--- | :--- |
| **Administrador** | Registra docentes y les envía por correo su usuario y contraseña provisional (que el docente puede cambiar); registra y gestiona materias; asigna un docente responsable a cada materia. |
| **Docente** | Consulta sus materias asignadas; crea el grafo de cada materia (nodos y conexiones según relaciones y prerrequisitos); edita los nodos, agrega descripciones y materiales (PDF, libros, investigaciones, bibliografía); crea evaluaciones manualmente o con BITSIBOOT; consulta estadísticas por nodo e identifica los temas con mayor y menor aprobación. |
| **Estudiante** | Se registra e inicia sesión; se inscribe a materias con el código que el docente le entrega fuera de la plataforma (por ejemplo, en clase); visualiza el grafo, consulta descripciones y materiales de cada nodo; realiza evaluaciones, ve su calificación con una explicación breve y recibe orientación de BITSIBOOT sobre los temas a reforzar. |

* **Administrador:** Permitir al administrador registrar a los docentes, asignarles las materias correspondientes y gestionar el acceso mediante la generación y el envío de credenciales por correo electrónico.
* **Docente:** Permitir al docente gestionar las materias que tiene asignadas, construir los grafos de conocimiento con sus temas, descripciones y materiales, crear evaluaciones de forma manual o con asistencia de BITSIBOOT, generar códigos de matrícula y consultar el mapa de calor y el rendimiento de sus estudiantes.
* **Estudiante:** Permitir al estudiante inscribirse en las materias mediante códigos, explorar los grafos y sus contenidos, resolver evaluaciones y consultar sus resultados, y recibir recomendaciones, rutas de recuperación y orientación de BITSIBOOT para dar seguimiento a su progreso.

![Figura 1. Diagrama de casos de uso de BIT ACADEMY](figura_1_casos_de_uso.png)  
*Figura 1. Diagrama de casos de uso de BIT ACADEMY*

---

## 6. BITSIBOOT: asistente inteligente

**BITSIBOOT** es el asistente inteligente integrado en BIT ACADEMY. Funciona con Google Gemini, al que el backend se conecta mediante una clave de Google AI Studio, y apoya a dos tipos de usuario:

* **Docente:** genera quizzes y evaluaciones a partir del material que el docente subió. Es una alternativa al editor manual de evaluaciones.
* **Estudiante:** aplica un quiz adaptativo y, según los resultados y el grafo de prerrequisitos, recomienda los temas previos o siguientes que necesita reforzar y propone una ruta de recuperación.

**Flujo de generación de evaluaciones:** el docente solicita la evaluación desde un nodo; el frontend envía la solicitud al backend; el backend lee el material del nodo y lo envía a Gemini; este genera las preguntas y el backend devuelve el resultado al docente.

---

## 7. Arquitectura del sistema

BIT ACADEMY usa una arquitectura full-stack organizada en tres capas: presentación (frontend), lógica (backend) y datos (base de datos). El frontend se conecta al backend mediante una API REST, y **BITSIBOOT** se integra como servicio externo a través del backend.

![Figura 2. Arquitectura general de BIT ACADEMY](figura_2_arquitectura.png)  
*Figura 2. Arquitectura general de BIT ACADEMY*

| Capa | Responsabilidad |
| :--- | :--- |
| **Frontend** | Interfaz gráfica; presenta las funcionalidades según el rol del usuario y envía las solicitudes al backend. |
| **Backend** | Autenticación y usuarios, materias y asignaciones, grafos (nodos y conexiones), evaluaciones, respuestas, estadísticas y comunicación con BITSIBOOT. |
| **Base de datos** | Almacena usuarios, materias, grafos, nodos, materiales, evaluaciones y resultados. |

**Flujo general:** el usuario interactúa con la interfaz, el frontend envía la solicitud al backend, este la procesa (consultando o modificando la base de datos si es necesario) y devuelve la respuesta, que el frontend presenta al usuario.

---

## 8. Tecnologías utilizadas

| Componente | Tecnología |
| :--- | :--- |
| **Frontend** | React (interfaces por componentes), Vite (servidor de desarrollo y compilación) y Tailwind CSS (estilos mediante clases de utilidad). |
| **Backend** | Node.js (entorno de ejecución de JavaScript), Express.js (servidor y API REST) y Prisma ORM (acceso a la base de datos). |
| **Base de datos** | MySQL. En desarrollo local se usa XAMPP como servidor local y phpMyAdmin para administrar las tablas. |
| **BITSIBOOT (IA)** | Google Gemini model `gemini-3.8-flash` |
| **Control de versiones** | Git y GitHub. |

---

## 9. Grafos de conocimiento

Cada materia tiene un grafo propio, compuesto por nodos (los temas de la materia) y conexiones (las relaciones y prerrequisitos definidos por el docente). Cada nodo contiene el nombre del tema, una descripción, materiales educativos y las evaluaciones relacionadas.

Las conexiones indican qué temas dependen de otros. Por ejemplo, en Cálculo: $$\text{Álgebra} \rightarrow \text{Factorización} \rightarrow \text{Límites} \rightarrow \text{Derivadas}$$

El grafo es dirigido y no se limita a una secuencia: un tema puede tener varios prerrequisitos y varios temas dependientes, como muestra la Figura 3.

![Figura 3. Grafo de conocimiento desde la vista del estudiante](figura_3_grafo_conocimiento.png)  
*Figura 3. Grafo de conocimiento de Cálculo I desde la vista del estudiante*

Al seleccionar un nodo, el estudiante consulta su descripción, materiales y evaluación, y puede iniciar un quiz adaptativo. Cada nodo se colorea según el dominio del estudiante, y el sistema muestra un diagnóstico que señala el tema previo donde se origina una dificultad. En la Figura 3, la dificultad en Límites proviene de Factorización, y la ruta de recuperación indica el orden en que conviene reforzar los temas.

---

## 10. Procesamiento y análisis de resultados

Al finalizar una evaluación, el sistema registra las respuestas y calcula la calificación. Con estos resultados determina el desempeño en cada nodo y lo presenta mediante colores en el grafo:

| Color | Estado | Criterio |
| :--- | :--- | :--- |
| **Verde** | Dominado | Desempeño $\ge 70\%$ |
| **Amarillo** | En progreso | Desempeño entre $40\%$ y $69\%$ |
| **Rojo** | Crítico | Desempeño $< 40\%$ |
| **Gris** | Sin datos | Aún no hay evaluaciones |

Con estos datos, el docente cuenta con un mapa de calor grupal que le permite identificar de un vistazo los temas con mayores y menores niveles de aprobación.

---

## 11. Base de datos

La base de datos almacena y relaciona la información necesaria para el funcionamiento de la plataforma:

| Grupo de información | Descripción |
| :--- | :--- |
| **Usuarios** | Administradores, docentes y estudiantes. |
| **Materias y asignaciones** | Materias registradas y docente responsable de cada una. |
| **Inscripciones** | Relación entre estudiantes y materias. |
| **Grafos, nodos y conexiones** | Estructura de conocimiento de cada materia. |
| **Materiales** | Recursos educativos asociados a los temas. |
| **Evaluaciones, preguntas y respuestas** | Evaluaciones manuales o generadas con BITSIBOOT, y respuestas de los estudiantes. |
| **Resultados** | Calificaciones obtenidas. |

---

## 12. API del sistema

La API permite la comunicación entre el frontend y el backend. Se organiza en los siguientes módulos:

| Módulo | Operaciones |
| :--- | :--- |
| **Autenticación** | Inicio de sesión y control de acceso. |
| **Usuarios** | Registro y gestión de docentes. |
| **Materias** | Registro, consulta y asignación. |
| **Inscripciones** | Acceso de estudiantes mediante códigos. |
| **Grafos, nodos y conexiones** | Creación, consulta y edición de la estructura de conocimiento. |
| **Materiales** | Gestión de recursos educativos. |
| **Evaluaciones y respuestas** | Creación, consulta, realización y registro de respuestas. |
| **Resultados y estadísticas** | Calificaciones y desempeño por nodo y materia. |
| **BITSIBOOT** | Generación de evaluaciones y orientación al estudiante. |

### Endpoints implementados en el backend

| Módulo | Método | Endpoint | Roles permitidos | Descripción y reglas de negocio |
| :--- | :--- | :--- | :--- | :--- |
| **Health** | GET | `/api/health` | Público | Estado del servidor, base de datos y modo de servicios (`EMAIL_MODE`, `AI_MODE`). |
| **Auth** | POST | `/api/auth/register/student` | Público | Registro de estudiante. Valida estrictamente que `sisCode` contenga `est.umss`. |
| **Auth** | POST | `/api/auth/login` | Público | Login unificado (`sisCode`, `email` o `username` + `password`). Devuelve JWT y `mustChangePassword`. |
| **Auth** | GET | `/api/auth/me` | ADMIN, DOCENTE, ESTUDIANTE | Obtiene el perfil del usuario autenticado a partir del token JWT. |
| **Auth** | POST | `/api/auth/changepassword` | ADMIN, DOCENTE, ESTUDIANTE | Cambia la contraseña actual y desactiva `mustChangePassword = false`. |
| **Admin** | GET | `/api/admin/teachers` | ADMIN | Lista todos los docentes con el conteo y detalle de materias asignadas. |
| **Admin** | POST | `/api/admin/teachers` | ADMIN | Alta de docente (`name`, `email`, `carnet`). Contraseña inicial = `carnet` (hasheada con bcrypt), `mustChangePassword = true` y envío de credenciales por correo. |
| **Admin** | GET | `/api/admin/subjects` | ADMIN | Lista todas las materias con sus docentes asignados y total de matriculados. |
| **Admin** | POST | `/api/admin/subjects` | ADMIN | Crea una nueva materia y genera su `enrollmentCode` único inicial. |
| **Admin** | PUT | `/api/admin/subjects/:subjectId` | ADMIN | Actualiza datos de una materia (`code`, `name`, `description`, `isActive`). |
| **Admin** | DELETE | `/api/admin/subjects/:subjectId` | ADMIN | Elimina una materia del sistema. |
| **Admin** | POST | `/api/admin/assignments` | ADMIN | Asigna una o varias materias (y grupos) a un docente y retorna cuántas dicta. |
| **Admin** | DELETE | `/api/admin/assignments/:assignmentId` | ADMIN | Remueve la asignación de una materia a un docente. |
| **Docente** | GET | `/api/teacher/subjects` | DOCENTE | Lista las materias asignadas al docente autenticado con conteo de nodos y estudiantes. |
| **Docente** | POST | `/api/teacher/subjects/:subjectId/enrollment-code` | DOCENTE, ADMIN | Genera o regenera el código de matriculación estilo Classroom para la materia. |
| **Grafos (DAG)** | GET | `/api/subjects/:subjectId/graph` | DOCENTE, ESTUDIANTE, ADMIN | Obtiene el grafo de la materia en formato listo para React Flow (`nodes: [{ id, title, description, position: {x, y} }]`, `edges: [{ id, source, target }]`). |
| **Grafos (DAG)** | PUT | `/api/subjects/:subjectId/graph` | DOCENTE, ADMIN | Persiste nodos y aristas del grafo tras ejecutar validación anti-ciclos (DAG) mediante algoritmo DFS/Kahn. Rechaza con 400 Bad Request si detecta ciclos. |
| **Temas / Nodos** | GET | `/api/nodes/:nodeId` | DOCENTE, ESTUDIANTE, ADMIN | Obtiene detalle de un nodo/tema, sus materiales de estudio, prerrequisitos y quizzes disponibles. |
| **Temas / Nodos** | PATCH | `/api/nodes/:nodeId` | DOCENTE, ADMIN | Actualiza título, descripción o coordenadas de un tema específico. |
| **Materiales** | POST | `/api/nodes/:nodeId/materials` | DOCENTE, ADMIN | Sube un archivo (`multipart/form-data` con Multer) o registra un enlace/recurso de estudio en el tema. |
| **Materiales** | DELETE | `/api/materials/:materialId` | DOCENTE, ADMIN | Elimina un material de estudio asociado a un tema. |
| **Quizzes** | GET | `/api/nodes/:nodeId/quizzes` | DOCENTE, ESTUDIANTE, ADMIN | Lista los quizzes de un nodo (para ESTUDIANTE oculta `correctOptionId` y `explanation`). |
| **Quizzes** | POST | `/api/nodes/:nodeId/quizzes` | DOCENTE, ADMIN | Crea manualmente un quiz con sus preguntas y opciones en un nodo. |
| **Quizzes** | PUT | `/api/quizzes/:quizId` | DOCENTE, ADMIN | Edita un quiz (incluyendo borradores generados por IA) y permite cambiar su estado (`DRAFT` / `PUBLISHED`). |
| **Quizzes** | DELETE | `/api/quizzes/:quizId` | DOCENTE, ADMIN | Elimina un quiz. |
| **Quizzes (IA)** | POST | `/api/nodes/:nodeId/quiz/generateai` | DOCENTE, ADMIN | Genera un quiz con IA en formato JSON estructurado en estado `DRAFT` (editable) basado en el título, descripción y materiales del tema. |
| **Estudiante** | POST | `/api/student/enroll` | ESTUDIANTE | Matricula al estudiante en una materia mediante su `enrollmentCode`. |
| **Estudiante** | GET | `/api/student/subjects` | ESTUDIANTE | Lista la grilla de materias matriculadas del estudiante y su progreso. |
| **Evaluación** | POST | `/api/quizzes/:quizId/submit` | ESTUDIANTE | Evalúa las respuestas en el servidor, guarda el intento y devuelve: `score`, `grade` (0-100), `passed`, retroalimentación, recomendaciones de nodos prerrequisito del grafo si reprueba/falla y posición en el ranking (`rank`). |
| **Mapa de Calor** | GET | `/api/subjects/:subjectId/heatmap` | DOCENTE, ADMIN | Agrega resultados por nodo: promedio de nota, tasa de aprobación/fallo, total de intentos, clasificación de criticidad (`HIGH_RISK`, `MEDIUM_RISK`, `HEALTHY`) y resumen de mejores/peores nodos. |

---

## 13. Seguridad y acceso

* Acceso mediante inicio de sesión; cada rol solo accede a las funcionalidades que le corresponden.
* Las credenciales de los docentes se entregan por correo como contraseña provisional, que el docente puede cambiar.
* Los estudiantes solo acceden a las materias en las que se inscribieron con el código del docente.
* La clave del servicio de IA y los datos de conexión a la base de datos se configuran en el archivo `.env` del backend.

---

## 14. Instalación y configuración

### 14.1. Requisitos previos
* Node.js 18 o superior y npm.
* MySQL en ejecución (por ejemplo, desde XAMPP en `localhost:3306`) con una base de datos llamada `kmap`.
* Para generar quizzes con IA: una clave gratuita de Google AI Studio ([aistudio.google.com/apikey](https://aistudio.google.com/apikey)).

### 14.2. Obtener el proyecto
```bash
git clone https://github.com/JorgePaniagua2607/kmap_dev.git
cd kmap_dev
```

### 14.3. Backend (carpeta backend/)
```bash
cd backend
npm install
cp .env.example .env
```

En Windows PowerShell, use `Copy-Item .env.example .env`. Luego, edite el archivo `.env` con estas variables:

```env
PORT=4000
FRONTEND_URL="http://localhost:5173"
DATABASE_URL="mysql://root:@localhost:3306/kmap"
AI_MODE="gemini"
AI_API_KEY="TU_CLAVE_DE_GOOGLE_AI_STUDIO"
AI_MODEL="gemini-3.8-flash"
```

Con MySQL encendido, prepare la base de datos y ejecute el servidor:

```bash
npx prisma generate
npx prisma db push
npm run prisma:seed
npm run dev
```

El backend queda escuchando en `http://localhost:4000`. Su estado puede verificarse en `http://localhost:4000/api/health`. Para producción, use `npm start`.

### 14.4. Frontend (carpeta frontend/)
En una segunda terminal, con el backend encendido:

```bash
cd frontend
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`. Vite redirige las peticiones `/api` y `/uploads` al backend. Para compilar para producción, ejecute `npm run build` (genera `frontend/dist`) y `npm run preview` para previsualizarla.

### 14.5. Cuentas de demostración

| Rol | Usuario | Contraseña |
| :--- | :--- | :--- |
| **Administrador** | `admin@demo.com` | `admin123` |
| **Docente** | `docente@demo.com` | `1234567` |
| **Estudiante** | `jhoselyn@est.umss.edu` | `123456` |

**Códigos de matrícula de demostración:** `KMAP-MAT101` (Matemáticas Básicas) y `ALG8Q5` (Álgebra Lineal).

---

## 15. Mejoras futuras

* Ampliar las capacidades de BITSIBOOT con nuevas formas de asistencia académica.
* Incorporar nuevas modalidades de evaluación y herramientas de análisis del desempeño.
* Mejorar la visualización de los grafos y de las estadísticas.
* Ampliar la gestión de materiales y extender la plataforma a otras áreas de conocimiento.

> *Organización del conocimiento, evaluación y asistencia inteligente para el aprendizaje.*
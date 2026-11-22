# Mapa de Conocimiento (BIT ACADEMY - Kmap)

Grafo de prerrequisitos que diagnostica por qué fallas: quiz adaptativo con IA a partir del material del docente → recomendaciones de temas previos o siguientes según el grafo DAG → ruta de recuperación, con mapa de calor para el docente.

> **Arquitectura Full-Stack:** Frontend en **React + Vite** (`frontend/`) conectado vía API REST al Backend en **Node.js + Express + Prisma + MySQL** (`backend/`), con generación de quizzes usando **Google Gemini AI** y lectura nativa de PDF/DOCX/TXT.

---

## Roles y Cuentas Demo

| Rol | Usuario / Identificador | Contraseña | Capacidades |
|---|---|---|---|
| **Admin** | `admin` (o `admin@demo.com` / `admin@plankmap.edu.bo`) | `admin123` (o `AdminKmap2026!` del seed) | Panel de administración, asignación de docentes y creación de materias. |
| **Docente** | `laura.gimenez@kmap.edu` (o `7654321`) / `docente@demo.com` | `7654321` / `1234567` | Gestión de materias, editor de grafo interactivo, subida de materiales, generación de quizzes con IA y mapa de calor grupal. |
| **Estudiante** | `202012345` (`jhoselyn@est.umss.edu`) / `2024001.est.umss` (`juan.torres@est.umss.edu`) | `123456` / `Estudiante123!` | Mis asignaturas, unirse con código, ver mapa de temas, realizar quizzes y recibir recomendaciones del grafo. |

* **Código de matrícula demo:** `KMAP-MAT101` (Matemáticas Básicas) / `ALG8Q5` (Álgebra Lineal).

---

## Puesta en marcha

### Requisitos previos
- **Node.js** `>= 18` y `npm`
- **MySQL** en ejecución (por ejemplo, desde **XAMPP** en `localhost:3306`) con la base de datos `kmap` creada
- *(Para generar quizzes con IA)* Clave gratuita de **Google AI Studio** ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))

---

### 1. Configurar y levantar el Backend (`backend/`)

1. **Instalar dependencias:**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar variables de entorno:**
   Copia el archivo de ejemplo y crea `backend/.env`:
   ```bash
   cp .env.example .env
   ```
   *(En Windows PowerShell: `Copy-Item .env.example .env`)*

   Verifica en `backend/.env` al menos estas variables:
   ```env
   PORT=4000
   FRONTEND_URL="http://localhost:5173"
   DATABASE_URL="mysql://root:@localhost:3306/kmap"

   AI_MODE="gemini"
   AI_API_KEY="TU_CLAVE_DE_GOOGLE_AI_STUDIO"
   AI_MODEL="gemini-3.8-flash"
   ```

3. **Preparar la base de datos (Prisma + Seed):**
   Asegúrate de tener MySQL encendido y la base de datos `kmap` creada, luego ejecuta:
   ```bash
   npx prisma generate
   npx prisma db push
   npm run prisma:seed
   ```
   > **Nota:** Si usas el proyecto localmente, ejecuta siempre `npx prisma` desde la carpeta `backend/` para usar Prisma 5 instalado en el proyecto.

4. **Iniciar el servidor backend:**
   - **Modo desarrollo** (con recarga automática):
     ```bash
     npm run dev
     ```
   - **Modo producción:**
     ```bash
     npm start
     ```
   El backend quedará escuchando en **http://localhost:4000** (puedes verificar su estado en **http://localhost:4000/api/health**).

---

### 2. Levantar el Frontend en modo desarrollo (`frontend/`)

En una **segunda terminal** (manteniendo el backend encendido):
```bash
cd frontend
npm install
npm run dev
```
Abre en el navegador: **http://localhost:5173**

*(Vite redirige automáticamente las peticiones `/api` y `/uploads` hacia `http://localhost:4000`.)*

---

### 3. Compilar el Frontend para producción

Genera la compilación lista para servir dentro de `frontend/dist`:
```bash
cd frontend
npm run build
```

Para previsualizar la compilación:
```bash
npm run preview
```

# Mapa de Conocimiento

Grafo de prerrequisitos que diagnostica por qué fallas: quiz adaptativo → tema raíz → ruta de recuperación, con mapa de calor para el docente.

## Stack
- Front: React + Vite + Tailwind · React Flow (editor) · Cytoscape.js (visualización) · Framer Motion · SweetAlert2
- Back: Node + Express · JWT con roles (docente / estudiante)
- BD: MySQL/MariaDB (XAMPP)

## Puesta en marcha (Windows + XAMPP)
1. Inicia **MySQL** desde el panel de XAMPP.
2. Desde la raíz del proyecto:
   ```
   npm run install:all        # instala raíz, back y front
   copy back\.env.example back\.env   # ajusta DB_PASS si tu root tiene contraseña
   npm run seed               # crea la BD "mapa_conocimiento" con datos demo
   npm run dev                # back :4000 + front :5173 (proxy /api)
   ```
3. Abre http://localhost:5173. Cuentas demo (contraseña `123456`): `docente@demo.com` · `estudiante@demo.com`

### Compilar y ejecutar en producción
```
npm run build    # compila front/dist
npm start        # el back sirve API + front en http://localhost:4000
```
> `npm run seed` borra y recrea la base de datos.

## Cómo funciona el diagnóstico (`back/src/services/diagnosis.js`)
1. El estudiante elige un tema objetivo (ej. Límites).
2. Se evalúa con 2–3 preguntas; la dificultad sube/baja según acierta (1–3).
3. Si reprueba (< 50 %), se encolan sus prerrequisitos y se repite hacia atrás; si aprueba, esa rama se corta.
4. **Tema raíz** = tema reprobado cuyos prerrequisitos están todos aprobados.
5. **Ruta** = camino más corto (BFS) del tema raíz al objetivo. El dominio se actualiza con media ponderada (40 % previo + 60 % nuevo).

## API
| Método | Ruta | Rol |
|---|---|---|
| POST | /api/auth/register, /login | público |
| GET/POST | /api/subjects | todos / docente |
| GET | /api/subjects/:id/graph | todos |
| PUT | /api/subjects/:id/graph | docente (valida DAG) |
| GET | /api/subjects/:id/diagnosis | todos |
| GET | /api/subjects/:id/heatmap | docente |
| GET/POST | /api/topics/:id/questions | docente |
| DELETE | /api/questions/:id | docente |
| POST | /api/quiz/start, /api/quiz/:id/answer | estudiante |

## Estructura
```
front/  React + Vite + Tailwind (src/pages, src/components)
back/   Express (src/routes, src/services, src/middleware, src/seed.js)
bd/     schema.sql
package.json  scripts de raíz (install:all, dev, build, start, seed)
```

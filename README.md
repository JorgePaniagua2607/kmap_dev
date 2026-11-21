# Mapa de Conocimiento (Kmap Academy)

Grafo de prerrequisitos que diagnostica por qué fallas: quiz adaptativo → recomendaciones de temas previos → ruta de recuperación, con mapa de calor para el docente.

> **Frontend Autónomo (Standalone):** Funciona al 100% en el cliente con **React + Vite** y persistencia local mediante `localStorage` (`front/src/lib/db.js`).

---

## Roles y Cuentas Demo

| Rol | Usuario / Identificador | Contraseña | Capacidades |
|---|---|---|---|
| **Estudiante** | `202012345` (o `ale@est.umss.edu`) | `123456` | Mis asignaturas, unirse con código, ver mapa de temas, realizar quizes y recomendaciones. |
| **Docente** | `Prof. Rivera` (o `1234567` / `rivera@umss.edu`) | `1234567` | Gestión de materias, editor de grafo interactivo, banco de preguntas con IA, mapa de calor grupal. |
| **Admin** | `admin` | `admin123` | Panel de administración, asignación de docentes y creación de materias. |

* **Código de matrícula demo:** `ALG8Q5` (Álgebra Lineal).

---

## Puesta en marcha

### 1. Iniciar en modo desarrollo
```bash
npm run dev
```
Abre en el navegador: **http://localhost:5173**

### 2. Compilar para producción
Genera la compilación lista para servir dentro de `front/dist`:
```bash
npm run build
```

Para previsualizar la compilación:
```bash
npm run preview
```

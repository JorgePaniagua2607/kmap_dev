# Mapa de Conocimiento (Frontend Standalone)

Grafo de prerrequisitos que diagnostica por qué fallas: quiz adaptativo → tema raíz → ruta de recuperación, con mapa de calor para el docente.

> **Modo Standalone**: Funciona 100% en el cliente con **React + Vite**, sin requerir backend ni base de datos MySQL activa. El estado, grafos, diagnósticos y preguntas persisten en `LocalStorage`.

## Puesta en marcha

### 1. Iniciar en modo desarrollo
Desde la raíz del proyecto o dentro de `front/`:
```bash
npm run dev
```
Abre tu navegador en: **http://localhost:5173**

### 2. Compilar para producción
Todo se compila dentro de la carpeta `front/dist`:
```bash
npm run build
```

Para previsualizar la compilación:
```bash
npm run preview
```

---

## Cuentas Demo (Contraseña: `123456`)
* **Docente**: `docente@demo.com` (Acceso a Mapa de Calor, Editor de Grafo y Banco de Preguntas)
* **Estudiante**: `estudiante@demo.com` (Acceso a Mi Mapa y Quices adaptativos)
* O crear una cuenta nueva directamente desde el formulario de registro.

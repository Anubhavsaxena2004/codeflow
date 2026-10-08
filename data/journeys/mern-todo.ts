import type { ScaffoldLine } from '@/data/challenges'
import type { JourneyTerm, Project } from '@/lib/journeys/types'
import { GIT_IDENTITY, GIT_TERMS, pushLesson, pushSteps } from './git'

// MERN Todo App: the folder structure from mern-todo-folder-structure.pdf, built world by world.
// One deviation from the PDF: Vite keeps index.html at client/ (not client/public/), so that is
// where it lives here too. Every command makes the files the real one makes; the ones this
// project never uses (Vite's demo CSS and logo, its README and lint config) are marked unused,
// so the explorer shows them locked.

const line = (text: string): ScaffoldLine => ({ type: 'line', text })
const slots = (count: number, indent: number): ScaffoldLine[] => Array.from({ length: count }, (_, index) => ({ type: 'slot', slot: index + 1, indent }))
const lines = (text: string) => text.split('\n').map(line)
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`

// ---- server/package.json as each command leaves it ------------------------------------
const serverPackage = (stage: 'init' | 'deps' | 'nodemon' | 'dev' | 'jest' | 'test') => {
  const at = (step: typeof stage) => ['init', 'deps', 'nodemon', 'dev', 'jest', 'test'].indexOf(stage) >= ['init', 'deps', 'nodemon', 'dev', 'jest', 'test'].indexOf(step)
  return json({
    name: 'server',
    version: '1.0.0',
    main: 'index.js',
    scripts: {
      test: at('test') ? 'jest' : 'echo "Error: no test specified" && exit 1',
      ...(at('dev') ? { dev: 'nodemon server.js' } : {}),
    },
    keywords: [],
    author: '',
    license: 'ISC',
    description: '',
    ...(at('deps') ? { dependencies: { cors: '^2.8.5', dotenv: '^17.2.2', express: '^5.1.0', mongoose: '^8.18.1' } } : {}),
    ...(at('nodemon') ? { devDependencies: { ...(at('jest') ? { jest: '^30.1.3' } : {}), nodemon: '^3.1.10' } } : {}),
  })
}

const clientPackage = (axios: boolean) =>
  json({
    name: 'client',
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'vite build', lint: 'eslint .', preview: 'vite preview' },
    dependencies: { ...(axios ? { axios: '^1.12.2' } : {}), react: '^19.1.1', 'react-dom': '^19.1.1' },
    devDependencies: {
      '@eslint/js': '^9.35.0',
      '@types/react': '^19.1.13',
      '@types/react-dom': '^19.1.9',
      '@vitejs/plugin-react': '^5.0.3',
      eslint: '^9.35.0',
      'eslint-plugin-react-hooks': '^5.2.0',
      'eslint-plugin-react-refresh': '^0.4.20',
      globals: '^16.4.0',
      vite: '^7.1.6',
    },
  })

// ---- root ---------------------------------------------------------------------------------
const README = `# Todo App (MERN)

A todo list with a React frontend and a Node + Express + MongoDB backend.

## Folder structure

    todo-app/
    ├── client/                  # React frontend (Vite)
    │   ├── src/
    │   │   ├── components/      # TodoForm, TodoItem, TodoList
    │   │   ├── services/
    │   │   │   └── api.js       # axios calls to the backend
    │   │   ├── App.jsx
    │   │   └── main.jsx
    │   ├── index.html
    │   └── package.json
    │
    ├── server/                  # Node + Express backend
    │   ├── config/db.js         # MongoDB connection
    │   ├── models/Todo.js       # Mongoose schema
    │   ├── controllers/         # create, read, update, delete
    │   ├── routes/              # URL → controller
    │   ├── tests/               # Jest tests
    │   ├── .env                 # secrets, never committed
    │   └── server.js            # entry point
    │
    ├── .gitignore
    └── README.md

## How the pieces connect

- models/: what a todo looks like (title, completed)
- controllers/: the logic for create, read, update, delete
- routes/: maps URLs (like GET /api/todos) to controller functions
- server.js: connects to the DB, sets up Express, mounts the routes
- services/api.js: the one place on the client that talks to the backend
- components/: UI pieces. TodoList renders many TodoItems; TodoForm adds new ones

Request flow: React component → api.js → route → controller → model → MongoDB, then back the same way.

## Where each file comes from

Commands write some files; you write the rest. A few files are made by a command but never used by this project (marked unused). They stay in the repository, as in any real project, but you never need to open them.

    npm init -y                                      (in server/)
        └── server/package.json
    npm install express mongoose dotenv cors
        ├── server/node_modules/                     generated, never committed
        └── server/package-lock.json
    npm create vite@latest client -- --template react
        ├── client/index.html
        ├── client/package.json
        ├── client/vite.config.js
        ├── client/.gitignore
        ├── client/public/vite.svg
        ├── client/src/main.jsx
        ├── client/src/App.jsx                       replaced by yours
        ├── client/src/index.css                     replaced by yours
        ├── client/README.md                         unused
        ├── client/eslint.config.js                  unused
        ├── client/src/App.css                       unused
        └── client/src/assets/react.svg              unused
    npm install                                      (in client/)
        ├── client/node_modules/                     generated, never committed
        └── client/package-lock.json
    npm test -- --coverage
        └── server/coverage/                         generated, never committed
    git init
        └── .git/
    written by you
        ├── server/.env
        ├── server/config/db.js
        ├── server/models/Todo.js
        ├── server/controllers/todoController.js
        ├── server/routes/todoRoutes.js
        ├── server/server.js
        ├── server/tests/todoController.test.js
        ├── client/src/services/api.js
        └── client/src/components/

## Run it on your computer

You need Node.js 20 or newer (npm comes with it), Git, and MongoDB: either MongoDB Community Server on your machine or a free MongoDB Atlas cluster.

### 1. Get the code

    git clone https://github.com/your-username/todo-app.git
    cd todo-app

### 2. Start the API (terminal 1)

Create server/.env with these two lines. With Atlas, use its connection string as MONGO_URI.

    PORT=5000
    MONGO_URI=mongodb://127.0.0.1:27017/todo-app

Then install the packages and start the server:

    cd server
    npm install                  # rebuilds node_modules from package.json
    npm run dev                  # API on http://localhost:5000

### 3. Start the React app (terminal 2)

    cd client
    npm install
    npm run dev                  # app on http://localhost:5173

### 4. Run the tests

    cd server
    npm test

## Push it to GitHub

### 1. Create an empty repository

On github.com, click + → New repository. Name it todo-app and leave "Add a README file" unticked, so the repository starts empty.

### 2. Create a personal access token

GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token. Tick the repo scope, pick an expiry, then generate it and copy it: GitHub shows it only once. Git asks for it instead of your password.

### 3. Commit and push

From the todo-app folder:

    git init
    git config --global user.name "Your Name"          # once per computer
    git config --global user.email "you@example.com"   # the email on your GitHub account
    git add .
    git commit -m "feat: MERN todo app"
    git remote add origin https://github.com/your-username/todo-app.git
    git branch -M main
    git push -u origin main                             # password: paste the token

After that, every change is three commands:

    git add .
    git commit -m "fix: describe the change"
    git push

Never commit server/.env or paste a token into a file. .gitignore already keeps .env out; if a token leaks, delete it on GitHub and make a new one.
`

const GITIGNORE = `# Reinstalled from package.json, never committed
node_modules/

# Secrets stay on your machine
.env

# Generated output
dist/
coverage/
`

// ---- server -------------------------------------------------------------------------------
const ENV_STARTER = `# Environment variables for the server. One NAME=value per line, no quotes needed.

# TODO 1: PORT, the port the API listens on: 5000

# TODO 2: MONGO_URI, where your database lives: mongodb://127.0.0.1:27017/todo-app
`

const ENV_SOLUTION = `# Environment variables for the server. One NAME=value per line, no quotes needed.

PORT=5000

MONGO_URI=mongodb://127.0.0.1:27017/todo-app
`

const DB_STARTER = `const mongoose = require("mongoose");

// Opens one connection when the server starts. Every model reuses it.
const connectDB = async () => {
  try {
    // TODO 1: connect with mongoose.connect, using MONGO_URI from .env (process.env)
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    // TODO 2: stop the process with exit code 1. A server without its database is useless.
  }
};

// TODO 3: export connectDB so server.js can require it
`

const DB_SOLUTION = `const mongoose = require("mongoose");

// Opens one connection when the server starts. Every model reuses it.
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
`

const MODEL_SOLUTION = `const mongoose = require("mongoose");

// What a todo looks like. Mongoose checks every document against this before saving.
const todoSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    completed: { type: Boolean, default: false },
  },
  // Adds createdAt and updatedAt automatically
  { timestamps: true }
);

module.exports = mongoose.model("Todo", todoSchema);
`

const MODEL_BUGGY = MODEL_SOLUTION.replace('new mongoose.Schema(', 'new mongoose.schema(')
  .replace('type: String', 'type: string')
  .replace('{ timestamps: true }', '{ timestamp: true }')
  .replace('module.exports =', 'module.export =')

const CONTROLLER_READ_STARTER = `// TODO 1: import the Todo model from ../models/Todo

// GET /api/todos: every todo, newest first
const getTodos = async (req, res) => {
  try {
    // TODO 2: find all todos, sorted by createdAt descending (-1)
    // TODO 3: send 200 OK with the todos array
  } catch (error) {
    return res.status(500).json({ message: "Could not load todos" });
  }
};

// TODO 4: export getTodos
`;

const CONTROLLER_READ_SOLUTION = `const Todo = require("../models/Todo");

// GET /api/todos: every todo, newest first
const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    return res.status(200).json(todos);
  } catch (error) {
    return res.status(500).json({ message: "Could not load todos" });
  }
};

module.exports = { getTodos };
`;

const CONTROLLER_CREATE_HEAD = `const Todo = require("../models/Todo");

// GET /api/todos: every todo, newest first
const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    return res.status(200).json(todos);
  } catch (error) {
    return res.status(500).json({ message: "Could not load todos" });
  }
};

// POST /api/todos: create one from { title }
const createTodo = async (req, res) => {
  try {`;

const CREATE_BODY = `    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    const todo = await Todo.create({ title });
    return res.status(201).json(todo);`;

const CONTROLLER_CREATE_TAIL = `  } catch (error) {
    return res.status(500).json({ message: "Could not create todo" });
  }
};

module.exports = { getTodos, createTodo };`;

const CONTROLLER_UPDATE_DELETE_STARTER = `const Todo = require("../models/Todo");

// GET /api/todos: every todo, newest first
const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    return res.status(200).json(todos);
  } catch (error) {
    return res.status(500).json({ message: "Could not load todos" });
  }
};

// POST /api/todos: create one from { title }
const createTodo = async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Title is required" });
    }
    const todo = await Todo.create({ title });
    return res.status(201).json(todo);
  } catch (error) {
    return res.status(500).json({ message: "Could not create todo" });
  }
};

// PUT /api/todos/:id: rename it or tick it off
const updateTodo = async (req, res) => {
  try {
    const { title, completed } = req.body;
    // TODO 1: find by req.params.id, update { title, completed }, and return 404 if missing
    return res.status(200).json(todo);
  } catch (error) {
    return res.status(500).json({ message: "Could not update todo" });
  }
};

// DELETE /api/todos/:id
const deleteTodo = async (req, res) => {
  try {
    // TODO 2: find by req.params.id, delete it, and return 404 if missing
    return res.status(200).json({ message: "Todo deleted", id: todo._id });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete todo" });
  }
};

// TODO 3: export getTodos, createTodo, updateTodo, deleteTodo
`;

const CONTROLLER_HEAD = `const Todo = require("../models/Todo");

// GET /api/todos: every todo, newest first
const getTodos = async (req, res) => {
  try {
    const todos = await Todo.find().sort({ createdAt: -1 });
    return res.status(200).json(todos);
  } catch (error) {
    return res.status(500).json({ message: "Could not load todos" });
  }
};

// POST /api/todos: create one from { title }
const createTodo = async (req, res) => {
  try {`;

const CONTROLLER_TAIL = `  } catch (error) {
    return res.status(500).json({ message: "Could not create todo" });
  }
};

// PUT /api/todos/:id: rename it or tick it off
const updateTodo = async (req, res) => {
  try {
    const { title, completed } = req.body;
    const todo = await Todo.findByIdAndUpdate(req.params.id, { title, completed }, { new: true, runValidators: true });
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    return res.status(200).json(todo);
  } catch (error) {
    return res.status(500).json({ message: "Could not update todo" });
  }
};

// DELETE /api/todos/:id
const deleteTodo = async (req, res) => {
  try {
    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) {
      return res.status(404).json({ message: "Todo not found" });
    }
    return res.status(200).json({ message: "Todo deleted", id: todo._id });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete todo" });
  }
};

module.exports = { getTodos, createTodo, updateTodo, deleteTodo };`;

const CONTROLLER = `${CONTROLLER_HEAD}\n${CREATE_BODY}\n${CONTROLLER_TAIL}\n`

const CONTROLLER_BUGGY = CONTROLLER.replace('const todos = await Todo.find()', 'const todos = Todo.find()')
  .replace('findByIdAndUpdate(req.params.id, { title, completed }, { new: true, runValidators: true })', 'findByIdAndUpdate(req.body.id, { title, completed }, { runValidators: true })')
  .replace(
    `    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) {
      return res.status(404)`,
    `    const todo = await Todo.findByIdAndDelete(req.params.id);
    if (!todo) {
      res.status(404)`,
  )

const ROUTES_STARTER = `const express = require("express");
const { getTodos, createTodo, updateTodo, deleteTodo } = require("../controllers/todoController");

const router = express.Router();

// Mounted at /api/todos in server.js, so "/" here means /api/todos
router.get("/", getTodos);
// TODO: POST   /      → createTodo
// TODO: PUT    /:id   → updateTodo
// TODO: DELETE /:id   → deleteTodo

module.exports = router;
`

const ROUTES_SOLUTION = `const express = require("express");
const { getTodos, createTodo, updateTodo, deleteTodo } = require("../controllers/todoController");

const router = express.Router();

// Mounted at /api/todos in server.js, so "/" here means /api/todos
router.get("/", getTodos);
router.post("/", createTodo);
router.put("/:id", updateTodo);
router.delete("/:id", deleteTodo);

module.exports = router;
`

const SERVER_STARTER = `require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const todoRoutes = require("./routes/todoRoutes");

const app = express();

// Let the React dev server (a different origin) call this API
app.use(cors());
// TODO 1: parse JSON request bodies (without this, req.body is undefined)

// TODO 2: mount todoRoutes under /api/todos

const PORT = process.env.PORT || 5000;

// TODO 3: connect to the database first, then start listening on PORT
`

const SERVER_SOLUTION = `require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const todoRoutes = require("./routes/todoRoutes");

const app = express();

// Let the React dev server (a different origin) call this API
app.use(cors());
// Parse JSON request bodies into req.body
app.use(express.json());

app.use("/api/todos", todoRoutes);

const PORT = process.env.PORT || 5000;

// Only take requests once the database is reachable
connectDB().then(() => {
  app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
});
`

const TEST_SOLUTION = `const { createTodo } = require("../controllers/todoController");
const Todo = require("../models/Todo");

// Swap the real model for a fake, so these tests never touch a database
jest.mock("../models/Todo", () => ({ create: jest.fn() }));

// A stand-in for Express's res that records what the controller sends back
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("createTodo", () => {
  afterEach(() => jest.clearAllMocks());

  test("rejects a missing title with 400", async () => {
    const res = mockResponse();

    await createTodo({ body: {} }, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Todo.create).not.toHaveBeenCalled();
  });

  test("creates the todo and responds 201", async () => {
    const saved = { _id: "1", title: "Learn MERN", completed: false };
    Todo.create.mockResolvedValue(saved);
    const res = mockResponse();

    await createTodo({ body: { title: "Learn MERN" } }, res);

    expect(Todo.create).toHaveBeenCalledWith({ title: "Learn MERN" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(saved);
  });
});
`

const TEST_STARTER = TEST_SOLUTION.replace(
  `    expect(res.status).toHaveBeenCalledWith(400);
    expect(Todo.create).not.toHaveBeenCalled();`,
  `    // TODO 1: expect res.status to have been called with 400
    // TODO 2: expect Todo.create NOT to have been called: bad input never reaches the database`,
).replace(
  `    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(saved);`,
  `    // TODO 3: expect a 201 status
    // TODO 4: expect res.json to have been called with the saved todo`,
)

// ---- client -------------------------------------------------------------------------------
const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Todo App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`

const VITE_CONFIG = `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
`

const ESLINT_CONFIG = `import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended, reactHooks.configs['recommended-latest'], reactRefresh.configs.vite],
    languageOptions: { ecmaVersion: 2020, globals: globals.browser, parserOptions: { ecmaFeatures: { jsx: true } } },
  },
])
`

const CLIENT_GITIGNORE = `# Logs
logs
*.log
npm-debug.log*

node_modules
dist
dist-ssr
*.local
`

const VITE_README = `# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [\`typescript-eslint\`](https://typescript-eslint.io) in your project.
`

const VITE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="#646cff" d="M30 5 17 28a1 1 0 0 1-2 0L2 5a1 1 0 0 1 1-1l13 2 13-2a1 1 0 0 1 1 1Z"/></svg>
`

const REACT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="32" viewBox="-11.5 -10.2 23 20.5"><circle r="2.05" fill="#61dafb"/><g fill="none" stroke="#61dafb"><ellipse rx="11" ry="4.2"/><ellipse rx="11" ry="4.2" transform="rotate(60)"/><ellipse rx="11" ry="4.2" transform="rotate(120)"/></g></svg>
`

const MAIN_JSX = `import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
`

const VITE_APP = `import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
      </div>
    </>
  )
}

export default App
`

const APP_CSS = `#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

.logo {
  height: 6em;
  padding: 1.5em;
}

.card {
  padding: 2em;
}
`

const VITE_INDEX_CSS = `:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  color-scheme: light dark;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
}
`

const TODO_INDEX_CSS = `:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  color: #1f2937;
  background: #f3f4f6;
}

body {
  margin: 0;
}

.app {
  max-width: 32rem;
  margin: 3rem auto;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
}

.todo-form {
  display: flex;
  gap: 0.5rem;
}

.todo-form input {
  flex: 1;
  padding: 0.5rem 0.75rem;
}

.todo-list {
  list-style: none;
  padding: 0;
}

.todo {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.todo.done label {
  text-decoration: line-through;
  color: #9ca3af;
}

.error {
  color: #b91c1c;
}
`

const API_STARTER = `import axios from "axios";

// The one place the client knows where the server lives
const api = axios.create({ baseURL: "http://localhost:5000/api" });

export const getTodos = async () => (await api.get("/todos")).data;

// TODO 1: createTodo(title): POST /todos with { title }, return the new todo
// TODO 2: updateTodo(id, changes): PUT /todos/:id with the changes, return the updated todo
// TODO 3: deleteTodo(id): DELETE /todos/:id
`

const API_SOLUTION = `import axios from "axios";

// The one place the client knows where the server lives
const api = axios.create({ baseURL: "http://localhost:5000/api" });

export const getTodos = async () => (await api.get("/todos")).data;

export const createTodo = async (title) => (await api.post("/todos", { title })).data;

export const updateTodo = async (id, changes) => (await api.put(\`/todos/\${id}\`, changes)).data;

export const deleteTodo = async (id) => (await api.delete(\`/todos/\${id}\`)).data;
`

const TODO_FORM = `import { useState } from "react";

// A controlled input: React state is the single source of truth for the text box
function TodoForm({ onAdd }) {
  const [title, setTitle] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    await onAdd(title.trim());
    setTitle("");
  };

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="What needs doing?" />
      <button type="submit">Add</button>
    </form>
  );
}

export default TodoForm;
`

const TODO_ITEM = `// One row. It never changes data itself: it tells App what the user did.
function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={todo.completed ? "todo done" : "todo"}>
      <label>
        <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo)} />
        {todo.title}
      </label>
      <button type="button" onClick={() => onDelete(todo._id)} aria-label={\`Delete \${todo.title}\`}>
        ✕
      </button>
    </li>
  );
}

export default TodoItem;
`

const TODO_LIST = `import TodoItem from "./TodoItem";

function TodoList({ todos, onToggle, onDelete }) {
  if (todos.length === 0) return <p className="empty">Nothing to do. Add your first todo above.</p>;

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        // key lets React match each row to its todo between renders
        <TodoItem key={todo._id} todo={todo} onToggle={onToggle} onDelete={onDelete} />
      ))}
    </ul>
  );
}

export default TodoList;
`

const APP_SOLUTION = `import { useEffect, useState } from "react";
import TodoForm from "./components/TodoForm";
import TodoList from "./components/TodoList";
import { getTodos, createTodo, updateTodo, deleteTodo } from "./services/api";

function App() {
  const [todos, setTodos] = useState([]);
  const [error, setError] = useState("");

  // Load the list once, when the page first renders
  useEffect(() => {
    getTodos()
      .then(setTodos)
      .catch(() => setError("Could not reach the server. Is it running?"));
  }, []);

  const handleAdd = async (title) => {
    const todo = await createTodo(title);
    setTodos((current) => [todo, ...current]);
  };

  const handleToggle = async (todo) => {
    const updated = await updateTodo(todo._id, { completed: !todo.completed });
    setTodos((current) => current.map((item) => (item._id === updated._id ? updated : item)));
  };

  const handleDelete = async (id) => {
    await deleteTodo(id);
    setTodos((current) => current.filter((item) => item._id !== id));
  };

  return (
    <main className="app">
      <h1>Todos</h1>
      {error && <p className="error">{error}</p>}
      <TodoForm onAdd={handleAdd} />
      <TodoList todos={todos} onToggle={handleToggle} onDelete={handleDelete} />
    </main>
  );
}

export default App;
`

const APP_BUGGY = APP_SOLUTION.replace('// Load the list once, when the page first renders', '// Load the list when the page first renders')
  .replace(`      .catch(() => setError("Could not reach the server. Is it running?"));
  }, []);`, `      .catch(() => setError("Could not reach the server. Is it running?"));
  });`)
  .replace('    setTodos((current) => [todo, ...current]);', '    todos.push(todo);\n    setTodos(todos);')
  .replace('updateTodo(todo._id,', 'updateTodo(todo.id,')
  .replace('current.filter((item) => item._id !== id)', 'current.filter((item) => item._id === id)')

// Explained in the workspace's Glossary tab; each level lists the terms its code uses.
const GLOSSARY: JourneyTerm[] = [
  // Node and npm
  { term: 'package.json', definition: "The project's manifest: its name, scripts, dependencies and devDependencies." },
  { term: 'npm init -y', definition: 'Creates package.json with the default answers (-y means yes to everything).', match: ['npm init'] },
  { term: 'npm install', definition: 'Downloads packages into node_modules and records them in package.json. --save-dev (or -D) records them as devDependencies instead.', match: ['npm install', 'npm i'] },
  { term: 'npm run', definition: 'Runs a script from package.json. npm test is a shortcut for the "test" script.', match: ['npm run', 'npm test', 'npm pkg'] },
  { term: 'node_modules', definition: 'Where npm puts downloaded packages. Never edited or committed: npm install recreates it.' },
  { term: 'nodemon', definition: 'Restarts the server every time you save a file. Only needed while developing.' },
  { term: '.env', definition: 'Local settings and secrets as NAME=value lines. Listed in .gitignore so it is never committed.' },
  { term: 'process.env', definition: 'Environment variables available to the running program. dotenv copies .env into it at startup.' },
  { term: 'dotenv', definition: 'Package that loads the .env file into process.env. Called first, before anything reads a setting.' },
  { term: 'require', definition: 'Loads a package or another file (CommonJS): const express = require("express").' },
  { term: 'module.exports', definition: 'What a file hands to whoever requires it. Whatever you assign here is the result of require().' },
  { term: 'async / await', definition: 'await pauses the function until a Promise settles, without blocking the server. Only allowed inside an async function.', match: ['async (', 'await '] },
  { term: 'try / catch', definition: 'If anything inside try throws (the database is down, say), execution jumps to catch so the server can still answer.', match: ['try {'] },
  // Express
  { term: 'app.use', definition: 'Runs middleware on every request, or mounts a router under a path prefix like /api/todos.' },
  { term: 'app.listen', definition: 'Starts accepting HTTP requests on a port.' },
  { term: 'express.json()', definition: 'Middleware that parses JSON request bodies. Without it, req.body is undefined.', match: ['express.json'] },
  { term: 'cors()', definition: 'Lets pages from another origin (the React dev server on port 5173) call this API.', match: ['cors'] },
  { term: 'express.Router()', definition: 'A mini app for related routes. Mounted with app.use, so its paths are relative to the mount point.', match: ['express.Router', 'router.'] },
  { term: 'req.body', definition: 'The parsed JSON the client sent with the request.' },
  { term: 'req.params', definition: 'Values from the URL path: for the route /:id, the id is in req.params.id.' },
  { term: 'res.status()', definition: 'Sets the HTTP status code of the response. Chain .json() to send it.', match: ['res.status'] },
  { term: 'res.json()', definition: 'Sends a JSON response and ends the request. Only one response per request.', match: ['res.json', ').json('] },
  { term: '200', definition: 'OK: the request worked.', match: ['(200)'] },
  { term: '201', definition: 'Created: a new resource was saved. The right answer to a successful POST.', match: ['(201)'] },
  { term: '400', definition: 'Bad Request: the client sent missing or invalid data.', match: ['(400)'] },
  { term: '404', definition: 'Not Found: nothing exists with that id.', match: ['(404)'] },
  { term: '500', definition: 'Internal Server Error: something failed on the server side.', match: ['(500)'] },
  { term: 'curl', definition: 'A command-line HTTP client: -X sets the method, -H adds a header, -d sends a body.' },
  // MongoDB and Mongoose
  { term: 'mongoose.connect', definition: 'Opens the MongoDB connection once, at startup. Returns a Promise.' },
  { term: 'Schema', definition: 'Describes a document: its fields and their rules (type, required, default, maxlength).', match: ['Schema', 'schema'] },
  { term: 'mongoose.model', definition: 'Turns a schema into a model you query with. Model "Todo" stores documents in the "todos" collection.' },
  { term: 'timestamps', definition: 'Schema option that adds createdAt and updatedAt to every document automatically.' },
  { term: 'Todo.find()', definition: 'Finds documents; with no filter, all of them. Chain .sort({ createdAt: -1 }) for newest first.', match: ['Todo.find('] },
  { term: 'Todo.create()', definition: 'Validates and inserts a document, then resolves to the saved copy with its _id.', match: ['Todo.create'] },
  { term: 'findByIdAndUpdate', definition: 'Updates one document by id. Resolves to the old version unless you pass { new: true }.' },
  { term: 'findByIdAndDelete', definition: 'Deletes one document by id and resolves to it, or to null when nothing matched.' },
  { term: '_id', definition: "MongoDB's unique id, generated for every document." },
  // React
  { term: 'Vite', definition: 'The dev server and build tool for the React app: npm run dev serves it, npm run build bundles it.', match: ['vite', 'Vite'] },
  { term: 'import / export', definition: 'ES modules: export makes something available, import uses it. export default is the main thing a file provides.', match: ['import ', 'export '] },
  { term: 'useState', definition: 'A React hook that keeps a value between renders. Calling its setter re-renders the component.' },
  { term: 'useEffect', definition: 'Runs code after a render. The dependency array decides when it runs again; [] means only once.' },
  { term: 'props', definition: 'Inputs a component receives from its parent, like todos or onAdd. Data flows down as props, events flow up as callbacks.', match: ['props', 'onAdd', 'onToggle', 'onDelete'] },
  { term: 'key', definition: 'Lets React match list items between renders. Use a stable id such as _id, never the array index.', match: ['key='] },
  { term: 'axios', definition: 'An HTTP client. axios.create makes an instance with a shared baseURL; response.data holds the parsed body.' },
  // Testing and git
  { term: 'jest.mock', definition: 'Replaces a module with a fake, so tests never touch the real thing (here, the database).' },
  { term: 'jest.fn()', definition: 'A fake function that records every call, so a test can check how it was used.', match: ['jest.fn'] },
  { term: 'expect', definition: 'Starts an assertion: expect(value).toBe(...), expect(mock).toHaveBeenCalledWith(...). .not flips it.', match: ['expect('] },
  { term: 'describe / test', definition: 'describe groups related tests; each test is one scenario with arrange, act and assert.', match: ['describe(', 'test('] },
  { term: 'git', definition: 'git init creates a repository, git add stages files, git commit records a snapshot with a message.', match: ['git init', 'git add', 'git commit'] },
  { term: '.gitignore', definition: 'Paths git must never commit, like node_modules/ and .env.' },
  ...GIT_TERMS,
]

const NODE_MODULES_ABOUT = 'Downloaded packages. Never edit or commit it: `npm install` recreates it from package.json.'
const LOCK_ABOUT = 'Exact versions of every installed package. Commit it in real projects; npm writes the real one on your machine.'
const lockfile = (name: string) => json({ name, version: name === 'server' ? '1.0.0' : '0.0.0', lockfileVersion: 3, requires: true, packages: {} })

export const mernTodo: Project = {
  id: 'mern-todo',
  track: 'mern',
  title: 'Todo App',
  summary: 'A full MERN todo list: Express API, MongoDB, React client, Jest tests.',
  projectName: 'todo-app',
  folders: {
    client: 'The React frontend, generated by Vite. It runs in the browser and never talks to MongoDB.',
    'client/public': 'Static files served as they are, like the favicon.',
    'client/src': 'All React code. main.jsx renders App into index.html.',
    'client/src/assets': "Images that components import. Only Vite's demo logo is here, and this project doesn't use it.",
    'client/src/components': 'UI pieces. TodoList renders many TodoItems; TodoForm adds new ones.',
    'client/src/services': 'The one place on the client that talks to the backend.',
    server: 'The Node + Express backend: the only part that talks to MongoDB.',
    'server/config': 'Connection setup. Values come from .env, never from the code.',
    'server/models': 'What a todo looks like (title, completed).',
    'server/controllers': 'The logic for create, read, update and delete.',
    'server/routes': 'Maps URLs like GET /api/todos to controller functions.',
    'server/tests': 'Jest tests. Every file ending in .test.js is a test suite.',
  },
  worlds: [
    { id: 'setup', title: 'Setup Village', subtitle: 'Plan the project and bootstrap the server', theme: 'village' },
    { id: 'database', title: 'Database Dungeon', subtitle: 'Connect to MongoDB and shape the data', theme: 'dungeon' },
    { id: 'api', title: 'API Forest', subtitle: 'Routes, controllers and your first requests', theme: 'forest' },
    { id: 'react', title: 'React Castle', subtitle: 'A client that talks to your API', theme: 'castle' },
    { id: 'testing', title: 'Test Lab', subtitle: 'Prove it works with Jest', theme: 'lab' },
    { id: 'production', title: 'Production City', subtitle: 'Commit it, push it to GitHub, see the whole architecture', theme: 'city' },
  ],
  levels: [
    // ---- World 1: Setup Village ------------------------------------------------------------
    {
      id: 'big-picture',
      world: 'setup',
      kind: 'explore',
      title: 'The big picture',
      summary: 'See how a MERN app splits into a client and a server.',
      lesson: `MERN is four tools that together make a full web app: MongoDB stores the data, Express and Node.js run the server, and React draws the screen in the browser.

The project is one folder with two apps inside it:
- \`client/\` is the React app. It runs in the browser and never talks to the database.
- \`server/\` is the Express API. It owns the database connection and answers HTTP requests with JSON.

Open the two new files in the explorer. README.md is the map of the whole journey: every folder in it unlocks, level by level, as you build it.`,
      adds: [
        { path: 'README.md', about: 'The map of the project: folders, how they connect, how to run it.', content: README },
        { path: '.gitignore', about: 'Files git must never commit: node_modules, .env, build output.', content: GITIGNORE },
      ],
      quiz: {
        question: 'Which part of the app is allowed to talk to MongoDB directly?',
        options: ['The React client', 'The Express server', 'Both of them'],
        answer: 1,
        explain: 'Only the server holds the database credentials. Anything shipped to the browser can be read by anyone, so the client asks the server and the server asks MongoDB.',
      },
    },
    {
      id: 'bootstrap-server',
      world: 'setup',
      kind: 'command',
      title: 'Bootstrap the server',
      summary: 'Create server/, its package.json, and install Express, Mongoose, dotenv and cors.',
      lesson: `Every Node project starts the same way: a folder, a package.json that describes it, and the packages it needs.

Type each command in the terminal and watch the explorer. Real tools create real files, and you'll see each one appear as it is written.

- \`npm init -y\` writes package.json with the default answers (-y means "yes to everything").
- \`npm install\` downloads packages into node_modules/ and records them in package.json, so anyone can reinstall them later with a plain \`npm install\`.`,
      cwd: '',
      steps: [
        {
          goal: 'Create a folder called server.',
          hint: 'The command is short for "make directory".',
          accept: ['mkdir server'],
          adds: [{ path: 'server/', about: 'The Express API. Empty for now.' }],
          explain: 'An empty folder appears. It fills up as you go.',
        },
        {
          goal: 'Move into the server folder.',
          hint: 'cd stands for "change directory".',
          accept: ['cd server', 'cd ./server', 'cd server/'],
          cwd: 'server',
          explain: 'Commands now run inside server/. The prompt shows where you are.',
        },
        {
          goal: 'Create a package.json with the default answers.',
          hint: 'npm can initialise a project, and a flag skips the questions.',
          accept: ['npm init -y', 'npm init --yes'],
          output: `Wrote to /todo-app/server/package.json:\n\n${serverPackage('init')}`,
          adds: [{ path: 'server/package.json', about: "The server's ID card: name, scripts and dependencies.", content: serverPackage('init') }],
          explain: 'package.json describes the project. Open it: the "scripts" section is where commands like npm test come from.',
        },
        {
          goal: 'Install express, mongoose, dotenv and cors in one command.',
          hint: 'npm install takes several package names at once, separated by spaces.',
          accept: ['npm install express mongoose dotenv cors'],
          output: 'added 94 packages, and audited 95 packages in 5s\n\n18 packages are looking for funding\n  run `npm fund` for details\n\nfound 0 vulnerabilities',
          adds: [
            { path: 'server/package.json', about: "The server's ID card: name, scripts and dependencies.", content: serverPackage('deps') },
            { path: 'server/package-lock.json', about: LOCK_ABOUT, content: lockfile('server'), generated: true },
            { path: 'server/node_modules/', about: NODE_MODULES_ABOUT, generated: true },
          ],
          explain: 'express is the web framework, mongoose talks to MongoDB, dotenv loads .env into process.env, and cors lets the React app (a different origin) call this API. Open package.json: they are listed under "dependencies".',
        },
        {
          goal: 'Install nodemon as a development-only dependency.',
          hint: 'Tools you only need while developing go in devDependencies. npm install has a flag for that: --save-dev (or -D).',
          accept: ['npm install --save-dev nodemon'],
          output: 'added 27 packages, and audited 122 packages in 2s\n\nfound 0 vulnerabilities',
          adds: [{ path: 'server/package.json', about: "The server's ID card: name, scripts and dependencies.", content: serverPackage('nodemon') }],
          explain: 'nodemon restarts the server every time you save a file. Production never needs it, so it lives in devDependencies.',
        },
        {
          goal: 'Add a "dev" script to package.json that runs: nodemon server.js',
          hint: 'npm can edit package.json for you: npm pkg set scripts.<name>="<command>"',
          accept: ['npm pkg set scripts.dev="nodemon server.js"'],
          adds: [{ path: 'server/package.json', about: "The server's ID card: name, scripts and dependencies.", content: serverPackage('dev') }],
          explain: 'From now on, npm run dev starts the server with nodemon. Check the "scripts" section of package.json.',
        },
      ],
    },
    {
      id: 'env-file',
      world: 'setup',
      kind: 'edit',
      title: 'Keep secrets in .env',
      summary: 'Give the server its port and database address without hard-coding them.',
      lesson: `Settings that change between machines (ports, database addresses, API keys) don't belong in code. They go in a \`.env\` file, one \`NAME=value\` per line, and the dotenv package copies them into \`process.env\` when the server starts.

.env is listed in .gitignore, so it never reaches GitHub. That is also why CodeFlow never pushes it for you.

Fill in the two values the server needs, then press Run tests.`,
      path: 'server/.env',
      about: 'Local settings and secrets, loaded by dotenv. Never committed.',
      starter: ENV_STARTER,
      solution: ENV_SOLUTION,
      checks: [
        { id: 'port', name: 'PORT is 5000', hint: 'Write PORT=5000 on its own line (lines starting with # are comments).', type: 'matches', value: /^\s*PORT\s*=\s*5000\s*$/.source, flags: 'm' },
        {
          id: 'mongo-uri',
          name: 'MONGO_URI points at a MongoDB database',
          hint: 'Write MONGO_URI=mongodb://127.0.0.1:27017/todo-app on its own line. An Atlas mongodb+srv:// address works too.',
          type: 'matches',
          value: /^\s*MONGO_URI\s*=\s*mongodb(\+srv)?:\/\/\S+$/.source,
          flags: 'm',
        },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Set PORT to 5000: the port the API listens on.',
          options: [
            { code: 'PORT = "5000";', why: 'That is JavaScript. A .env line is just NAME=value: with the quotes and the semicolon, the value becomes "5000"; and the server cannot listen on it.' },
            { code: 'PORT=5000', why: 'One NAME=value per line. dotenv copies it into process.env.PORT when the server starts.' },
            { code: 'port=5000', why: 'Names are case-sensitive. The server reads process.env.PORT, so a lowercase port is never found.' },
          ],
          answer: 1,
          checks: ['port'],
          sources: [{ name: 'dotenv', from: 'file', path: 'server/package.json', find: '"dotenv"', note: 'The package you installed in Setup Village. It reads this file when the server starts.' }],
          result: 'dotenv puts it in process.env.PORT. server.js will listen on process.env.PORT || 5000.',
        },
        {
          marker: 'TODO 2:',
          goal: 'Set MONGO_URI to the address of your database.',
          options: [
            { code: 'MONGO_URI=http://127.0.0.1:27017/todo-app', why: 'MongoDB does not speak HTTP. Its addresses start with mongodb:// (or mongodb+srv:// on Atlas).' },
            { code: 'MONGO_URI=127.0.0.1:27017/todo-app', why: 'Without the mongodb:// scheme, Mongoose cannot tell what kind of address this is and refuses it: Invalid scheme.' },
            { code: 'MONGO_URI=mongodb://127.0.0.1:27017/todo-app', why: 'The mongodb:// scheme, the server (your own machine, on MongoDB\'s default port 27017) and the database name, todo-app.' },
          ],
          answer: 2,
          checks: ['mongo-uri'],
          sources: [{ name: 'mongodb://', from: 'builtin', note: 'How every MongoDB address starts. todo-app at the end is the database: MongoDB creates it the first time something is saved.' }],
          result: 'It stays on your machine (.gitignore lists .env). config/db.js will connect with process.env.MONGO_URI.',
        },
      ],
    },

    // ---- World 2: Database Dungeon ---------------------------------------------------------
    {
      id: 'connect-db',
      world: 'database',
      kind: 'edit',
      title: 'Connect to MongoDB',
      summary: 'Open the database connection once, when the server starts.',
      lesson: `Before the server can store a single todo it needs a connection to MongoDB. Mongoose opens it once at startup, and every model reuses it.

\`mongoose.connect()\` returns a Promise, so you \`await\` it. If it fails there is no point running an API without its database: log why and stop the process with a non-zero exit code, so whatever started it (you, nodemon, a hosting platform) knows something is wrong.

To run this for real, start MongoDB locally or create a free MongoDB Atlas cluster and put its address in .env.`,
      path: 'server/config/db.js',
      about: 'Opens the MongoDB connection once, at startup.',
      starter: DB_STARTER,
      solution: DB_SOLUTION,
      checks: [
        { id: 'await-connect', name: 'Waits for mongoose.connect', hint: 'mongoose.connect returns a Promise. Put await in front of it.', type: 'includes', value: 'await mongoose.connect(' },
        { id: 'env-uri', name: 'Reads the address from .env', hint: 'Pass process.env.MONGO_URI to mongoose.connect. Never paste the address into the code.', type: 'includes', value: 'mongoose.connect(process.env.MONGO_URI)' },
        { id: 'exit', name: 'Stops the server when the connection fails', hint: 'In the catch block, call process.exit(1). Exit code 1 means "failed".', type: 'includes', value: 'process.exit(1)' },
        { id: 'export', name: 'Exports connectDB', hint: 'server.js will do require("./config/db") and call the result, so export the function itself: module.exports = connectDB;', type: 'matches', value: /^\s*module\.exports\s*=\s*connectDB\s*;?\s*$/.source, flags: 'm' },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Wait for Mongoose to connect, using the address from .env.',
          options: [
            { code: 'mongoose.connect(process.env.MONGO_URI);', why: 'No await: "MongoDB connected" is printed before anything is connected, and a failed connection never reaches the catch block.' },
            { code: 'await mongoose.connect("mongodb://127.0.0.1:27017/todo-app");', why: 'It works on your laptop only. The address is now in code that goes to GitHub, and every other machine needs its own. Read it from .env.' },
            { code: 'await mongoose.connect(process.env.MONGO_URI);', why: 'mongoose.connect returns a Promise. await pauses connectDB until MongoDB answers, and a failure jumps to catch.' },
          ],
          answer: 2,
          checks: ['await-connect', 'env-uri'],
          sources: [
            { name: 'mongoose', from: 'import', find: 'require("mongoose")', note: 'The Mongoose package, installed in Setup Village and required on line 1. It talks to MongoDB for you.' },
            { name: 'process.env', from: 'builtin', note: "Node's table of environment variables. dotenv fills it from server/.env before this code runs." },
            { name: 'MONGO_URI', from: 'file', path: 'server/.env', find: 'MONGO_URI', note: 'The address you wrote in server/.env.' },
            { name: 'await', from: 'here', find: 'const connectDB = async', note: 'Only allowed inside an async function. connectDB is declared async on this line.' },
          ],
          result: 'Nothing to hand back: once connect resolves, the connection is open and every model reuses it.',
        },
        {
          marker: 'TODO 2:',
          goal: 'When connecting fails, stop the whole server with exit code 1.',
          options: [
            { code: 'process.exit(1);', why: 'Ends the Node process. 1 means it failed, so nodemon or a hosting platform knows something is wrong.' },
            { code: 'return 1;', why: 'That only ends connectDB. The server keeps running with no database, and every request fails.' },
            { code: 'process.exit(0);', why: 'Exit code 0 means success. The process stops, but whatever started it thinks all went well.' },
          ],
          answer: 0,
          checks: ['exit'],
          sources: [{ name: 'process', from: 'builtin', note: "Node's object for the running program: its settings (process.env) and how to stop it (process.exit)." }],
          result: 'No result: the program ends here. A non-zero exit code is how a program tells whoever started it that it failed.',
        },
        {
          marker: 'TODO 3:',
          goal: 'Export connectDB itself, so server.js can require it and call it.',
          options: [
            { code: 'module.export = connectDB;', why: 'module.export (no s) is just a new property nobody reads. require() returns module.exports, still an empty object, so server.js fails with "connectDB is not a function".' },
            { code: 'module.exports = connectDB();', why: 'The parentheses call connectDB right now, while the file loads, and export the Promise it returns. server.js needs the function itself, to call when it is ready.' },
            { code: 'module.exports = connectDB;', why: 'Hands the function, not a call of it, to whoever requires this file.' },
          ],
          answer: 2,
          checks: ['export'],
          sources: [
            { name: 'connectDB', from: 'here', find: 'const connectDB = async', note: 'The function defined on this line.' },
            { name: 'module.exports', from: 'builtin', note: 'Node gives every file a module object. Whatever you put in module.exports is what require() returns.' },
          ],
          result: 'server.js does const connectDB = require("./config/db"), gets this function, and calls connectDB() before it starts listening.',
        },
      ],
    },
    {
      id: 'model-bug-hunt',
      world: 'database',
      kind: 'bugfix',
      boss: true,
      title: 'Bug hunt: the Todo model',
      summary: 'A teammate wrote the model in a hurry. Find the four bugs before they ship.',
      lesson: `A model describes what one document looks like. The schema lists the fields and their rules; \`mongoose.model("Todo", schema)\` turns it into the \`Todo\` object that controllers use to find, create, update and delete. MongoDB stores the documents in a collection called \`todos\`.

A teammate wrote this model in a hurry. It has four bugs: two crash the server the moment it starts, and two fail silently, which is worse. Each test below says what should be true. Read the code, fix it, and run the tests.`,
      path: 'server/models/Todo.js',
      about: 'The Mongoose schema: what a todo looks like.',
      starter: MODEL_BUGGY,
      solution: MODEL_SOLUTION,
      checks: [
        { id: 'schema-class', name: 'Builds the schema with mongoose.Schema', hint: 'Startup crashes with "TypeError: mongoose.schema is not a constructor". JavaScript is case-sensitive: the class is Schema.', type: 'includes', value: 'new mongoose.Schema(' },
        { id: 'title-type', name: 'title is stored as a String', hint: '"ReferenceError: string is not defined". Schema types are the built-in constructors String, Number, Boolean and Date, all capitalised.', type: 'matches', value: /title:\s*\{[^}]*type:\s*String\b/.source },
        { id: 'timestamps', name: 'Documents get createdAt and updatedAt', hint: 'Mongoose ignores options it does not recognise, so a typo here fails silently. The option name is plural.', type: 'includes', value: 'timestamps: true' },
        { id: 'export', name: 'The model is exported', hint: 'module.export (no s) just adds a property; the file still exports an empty object, and the controller later fails with "Todo.find is not a function".', type: 'includes', value: 'module.exports = mongoose.model("Todo", todoSchema)' },
      ],
    },

    // ---- World 3: API Forest ---------------------------------------------------------------
    {
      id: 'request-response-cycle',
      world: 'api',
      kind: 'explore',
      title: 'The request-response cycle',
      summary: 'Trace how an HTTP request travels from the client, through middleware and controllers, to MongoDB and back.',
      lesson: `Web communication follows a strict request-response cycle: the **client requests**, and the **server responds**. Understanding every step in this journey is what turns someone from a code-paster into a backend engineer.

Here is the exact journey of a request in a MERN app:
1. **The Client sends an HTTP Request**: When a user types a todo and clicks "Add", the browser (via axios/fetch) sends an HTTP message containing:
   - **Method (Verb)**: \`GET\` (read), \`POST\` (create), \`PUT\` (update), or \`DELETE\` (remove).
   - **URL Path**: Where the request goes (e.g. \`/api/todos\` or \`/api/todos/:id\`).
   - **Headers**: Metadata like \`Content-Type: application/json\` describing the payload.
   - **Body**: The JSON string carrying data (e.g. \`{"title": "Buy milk"}\`).

2. **Express Middleware Pipeline**: The Express server receives the request on port 5000. Before any route runs, middleware inspects and transforms it:
   - \`cors()\` allows requests from the React dev server (a different port/domain).
   - \`express.json()\` intercepts the raw incoming byte stream, parses it, and places the resulting JavaScript object into \`req.body\`. Without this, \`req.body\` is undefined.

3. **Routing to the Controller**: Express matches the method and path against \`todoRoutes.js\`. Matching \`POST /api/todos\` invokes the controller function: \`createTodo(req, res)\`.

4. **Controller Logic & Database Execution**: The controller executes your business logic:
   - Validates input (guard clauses returning 400 Bad Request if fields are invalid).
   - Talks asynchronously to MongoDB through the Mongoose model (\`await Todo.create({ title })\`).

5. **The HTTP Response**: The controller finishes the cycle by sending an HTTP response:
   - **Status Code**: \`200 OK\`, \`201 Created\`, \`400 Bad Request\`, \`404 Not Found\`, or \`500 Server Error\`.
   - **Response Body**: The saved JSON document: \`return res.status(201).json(todo);\`.
   - The client receives the response, updates its React state, and re-renders the screen.`,
      adds: [],
      quiz: {
        question: 'What is the correct sequence of events when a client creates a new todo with a POST request?',
        options: [
          'Browser sends HTTP POST → express.json() parses body into req.body → router dispatches to controller → controller validates & awaits Mongoose write → res.status(201).json() sends response back',
          'Browser saves document directly to MongoDB → Express polls the database for changes → Server sends GET request to React',
          'Express controller runs in the browser → React writes to server disk → Server responds with HTML',
        ],
        answer: 0,
        explain: 'Express middleware parses the incoming request body first, the router directs it to the controller, the controller handles validation and awaits the database write, and res.json() sends the HTTP response back to the client.',
      },
    },
    {
      id: 'controller-read',
      world: 'api',
      kind: 'edit',
      title: 'Import the model and Read todos',
      summary: 'Require the Todo model, query all documents in getTodos, and export the handlers.',
      lesson: `A controller is the function that runs when a route is hit. It reads the request, decides what to do, and sends exactly one response.

Every controller starts from scratch by requiring the model it interacts with. Then \`getTodos\` queries MongoDB for every todo:
- \`Todo.find()\` finds documents matching the query (empty means everything).
- \`.sort({ createdAt: -1 })\` sorts them newest first (-1 is descending, 1 is ascending).
- Because database operations are asynchronous, you must \`await\` the query.
- \`res.status(200).json(todos)\` sends HTTP 200 OK with the array as JSON.

Finally, \`module.exports\` exports the handlers so \`todoRoutes.js\` can require them.`,
      path: 'server/controllers/todoController.js',
      about: 'The logic for create, read, update and delete.',
      starter: CONTROLLER_READ_STARTER,
      solution: CONTROLLER_READ_SOLUTION,
      checks: [
        { id: 'import', name: 'Imports the Todo model', hint: 'const Todo = require("../models/Todo"); at the top.', type: 'includes', value: 'const Todo = require("../models/Todo")' },
        { id: 'find-sort', name: 'Queries all todos newest first', hint: 'const todos = await Todo.find().sort({ createdAt: -1 });', type: 'includes', value: 'const todos = await Todo.find().sort({ createdAt: -1 })' },
        { id: 'respond-200', name: 'Sends 200 OK with the todos', hint: 'return res.status(200).json(todos);', type: 'includes', value: 'return res.status(200).json(todos)' },
        { id: 'export', name: 'Exports getTodos', hint: 'module.exports = { getTodos };', type: 'includes', value: 'module.exports = { getTodos }' },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Import the Todo model from ../models/Todo.',
          options: [
            { code: 'const Todo = require("../models/Todo");', why: 'Loads the Mongoose model you created in the Database Dungeon so this controller can query MongoDB.' },
            { code: 'const Todo = require("./models/Todo");', why: 'Wrong path: controllers is inside server/, so you must go up one folder with ../ to reach models/.' },
            { code: 'const Todo = require("mongoose");', why: 'This imports Mongoose itself, not your Todo model. You need the model to query todos.' },
          ],
          answer: 0,
          checks: ['import'],
          sources: [{ name: 'Todo', from: 'file', path: 'server/models/Todo.js', find: 'module.exports = mongoose.model("Todo", todoSchema)', note: 'The model you created in the Database Dungeon.' }],
          result: 'Todo is now available in this file to run queries like Todo.find().',
        },
        {
          marker: 'TODO 2:',
          goal: 'Find all todos sorted by createdAt descending (-1).',
          options: [
            { code: 'const todos = Todo.find().sort({ createdAt: -1 });', why: 'Missing await: Todo.find() returns a query/promise. Without await, todos is a Promise, not the array of documents.' },
            { code: 'const todos = await Todo.find().sort({ createdAt: -1 });', why: 'Queries the database for every document in the todos collection, newest first (-1).' },
            { code: 'const todos = await Todo.find().sort({ createdAt: 1 });', why: 'Sorting by 1 sorts in ascending order (oldest first). Users expect to see their newest todos at the top.' },
          ],
          answer: 1,
          checks: ['find-sort'],
          sources: [{ name: 'Todo', from: 'here', find: 'const Todo = require("../models/Todo")', note: 'Imported on line 1.' }],
          result: 'todos holds the array of documents returned by MongoDB.',
        },
        {
          marker: 'TODO 3:',
          goal: 'Send 200 OK with the todos array.',
          options: [
            { code: 'return res.status(200).json(todos);', why: 'Sets status 200 OK and serializes the todos array to JSON for the client.' },
            { code: 'return res.status(201).json(todos);', why: '201 means "Created". A read query was successful, so standard 200 OK is the correct HTTP status.' },
            { code: 'return res.send(todos.toString());', why: 'res.send with toString() produces "[object Object]" instead of valid JSON that the client can parse.' },
          ],
          answer: 0,
          checks: ['respond-200'],
          sources: [{ name: 'res', from: 'param', find: 'const getTodos = async (req, res)', note: 'Express response object passed into every route handler.' }],
          result: 'The client receives the JSON array and HTTP 200.',
        },
        {
          marker: 'TODO 4:',
          goal: 'Export getTodos so the router can use it.',
          options: [
            { code: 'module.exports = getTodos;', why: 'Exporting just the function directly prevents exporting the other CRUD handlers later. Export an object: { getTodos }.' },
            { code: 'module.exports = { getTodos };', why: 'Exports an object containing getTodos, ready for the router to destructure.' },
            { code: 'export default { getTodos };', why: 'This server uses CommonJS (require/module.exports). ES module export syntax is not used here.' },
          ],
          answer: 1,
          checks: ['export'],
          sources: [{ name: 'getTodos', from: 'here', find: 'const getTodos = async', note: 'The read handler defined above.' }],
          result: 'todoRoutes.js can now require and mount getTodos.',
        },
      ],
    },
    {
      id: 'create-todo',
      world: 'api',
      kind: 'build',
      title: 'Build createTodo',
      summary: 'Arrange the steps of POST /api/todos: read, validate, save, respond.',
      lesson: `Now add the Create operation to your controller.

Build createTodo from the blocks. It follows a four-step pattern common to almost every web API:
1. Extract user input from \`req.body\`
2. Validate with a guard clause (reject empty titles with 400 Bad Request before touching the database)
3. Save the new document with \`Todo.create({ title })\` and await the result
4. Respond with \`201 Created\` and the saved document

Some blocks look right but hide a bug: hover one to read what it does.`,
      path: 'server/controllers/todoController.js',
      about: 'The logic for create, read, update and delete.',
      scaffold: [...lines(CONTROLLER_CREATE_HEAD), ...slots(4, 4), ...lines(CONTROLLER_CREATE_TAIL)],
      blocks: [
        { id: 'extract', label: 'Read the title from the body', code: 'const { title } = req.body;', what: 'Destructures title out of the parsed JSON body. express.json() in server.js is what fills req.body.', whyHere: 'Everything after this needs the title.' },
        { id: 'validate', label: 'Reject a missing title', code: 'if (!title || !title.trim()) {\n  return res.status(400).json({ message: "Title is required" });\n}', what: 'A guard clause: stop early with 400 Bad Request when the title is missing or only spaces.', whyHere: 'Validate before touching the database, so bad requests never cost a write.' },
        { id: 'create', label: 'Save the todo', code: 'const todo = await Todo.create({ title });', what: 'Inserts a document and resolves to it, with its new _id and timestamps.', whyHere: 'Only valid input reaches the database.' },
        { id: 'respond', label: 'Send the new todo back', code: 'return res.status(201).json(todo);', what: '201 Created, with the saved todo, so the client can show it and later update or delete it by _id.', whyHere: 'The response is always last: once it is sent, the request is over.' },
        { id: 'bad-create', label: 'Save the todo', code: 'const todo = Todo.create({ title });', what: 'Creates the todo.', whyWrong: 'Missing await: todo is a pending Promise, and res.json would send {}.' },
        { id: 'bad-validate', label: 'Reject an empty title', code: 'if (title === "") {\n  return res.status(400).json({ message: "Title is required" });\n}', what: 'Checks the title.', whyWrong: 'A request with no title has title === undefined, which slips past this check, and so does "   ".' },
        { id: 'bad-respond', label: 'Confirm it worked', code: 'return res.status(200).send("Created");', what: 'Tells the client it worked.', whyWrong: '201 is the status for "created", and the client needs the saved todo (with its _id) to show it and change it later.' },
      ],
      steps: [
        { kind: 'Request input', goal: 'Pull the title out of the request body.' },
        { kind: 'Guard clause', goal: 'Stop early when the title is missing. Responds 400.' },
        { kind: 'Database write', goal: 'Save the new todo and wait for the result.' },
        { kind: 'Response', goal: 'Send the saved todo back. Responds 201.' },
      ],
    },
    {
      id: 'controller-update-delete',
      world: 'api',
      kind: 'edit',
      title: 'Build Update and Delete handlers',
      summary: 'Complete the CRUD operations with findByIdAndUpdate and findByIdAndDelete.',
      lesson: `Now complete the CRUD suite by adding updateTodo and deleteTodo:

- \`updateTodo\` receives the ID in \`req.params.id\` and updated fields in \`req.body\`. \`Todo.findByIdAndUpdate(id, data, { new: true, runValidators: true })\` finds the row, applies updates, and returns the modified document.
- \`deleteTodo\` removes the document with \`Todo.findByIdAndDelete(id)\`.
- Both operations must check \`if (!todo)\` and return \`404 Not Found\` if the document does not exist.
- Finally, export all four handlers so the router can wire every CRUD operation.`,
      path: 'server/controllers/todoController.js',
      about: 'The logic for create, read, update and delete.',
      starter: CONTROLLER_UPDATE_DELETE_STARTER,
      solution: CONTROLLER,
      checks: [
        { id: 'update', name: 'updateTodo updates by id with new and runValidators, or returns 404', hint: 'const todo = await Todo.findByIdAndUpdate(req.params.id, { title, completed }, { new: true, runValidators: true }); if (!todo) return res.status(404)...', type: 'includes', value: 'const todo = await Todo.findByIdAndUpdate(req.params.id, { title, completed }, { new: true, runValidators: true });\n    if (!todo) {\n      return res.status(404).json({ message: "Todo not found" });\n    }' },
        { id: 'delete', name: 'deleteTodo deletes by id or returns 404', hint: 'const todo = await Todo.findByIdAndDelete(req.params.id); if (!todo) return res.status(404)...', type: 'includes', value: 'const todo = await Todo.findByIdAndDelete(req.params.id);\n    if (!todo) {\n      return res.status(404).json({ message: "Todo not found" });\n    }' },
        { id: 'exports', name: 'Exports all four CRUD handlers', hint: 'module.exports = { getTodos, createTodo, updateTodo, deleteTodo };', type: 'includes', value: 'module.exports = { getTodos, createTodo, updateTodo, deleteTodo };' },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Find todo by req.params.id, update { title, completed }, and return 404 if missing.',
          options: [
            { code: 'const todo = await Todo.findByIdAndUpdate(req.params.id, { title, completed }, { new: true, runValidators: true });\n    if (!todo) {\n      return res.status(404).json({ message: "Todo not found" });\n    }', why: 'Updates the document, enforces Mongoose schema validation with runValidators, returns the new doc with new: true, and stops early with 404 if missing.' },
            { code: 'const todo = Todo.findByIdAndUpdate(req.params.id, { title, completed });\n    if (!todo) {\n      return res.status(404).json({ message: "Todo not found" });\n    }', why: 'Missing await: todo is a pending Promise, so it is never null and the updated document is never returned.' },
            { code: 'const todo = await Todo.findByIdAndUpdate(req.body.id, { title, completed });\n    if (!todo) {\n      return res.status(404).json({ message: "Todo not found" });\n    }', why: 'The ID is in the URL path (req.params.id), not the request body, and missing { new: true } returns the outdated document.' },
          ],
          answer: 0,
          checks: ['update'],
          sources: [
            { name: 'req', from: 'param', find: 'const updateTodo = async (req, res)', note: 'Express request object containing req.params.id and req.body.' },
            { name: 'Todo', from: 'here', find: 'const Todo = require("../models/Todo")', note: 'Imported on line 1.' },
          ],
          result: 'todo holds the updated document from MongoDB.',
        },
        {
          marker: 'TODO 2:',
          goal: 'Find todo by req.params.id, delete it, and return 404 if missing.',
          options: [
            { code: 'const todo = Todo.findByIdAndDelete(req.params.id);\n    if (!todo) {\n      return res.status(404).json({ message: "Todo not found" });\n    }', why: 'Missing await: findByIdAndDelete returns a Promise that must be awaited before checking if anything was found.' },
            { code: 'const todo = await Todo.findByIdAndDelete(req.params.id);\n    if (!todo) {\n      return res.status(404).json({ message: "Todo not found" });\n    }', why: 'Awaits deletion by ID and returns 404 if the document was not found.' },
            { code: 'const todo = await Todo.findByIdAndDelete(req.body.id);\n    if (!todo) {\n      return res.status(404).json({ message: "Todo not found" });\n    }', why: 'The ID comes from the URL parameter req.params.id, not req.body.id.' },
          ],
          answer: 1,
          checks: ['delete'],
          sources: [{ name: 'Todo', from: 'here', find: 'const Todo = require("../models/Todo")', note: 'Imported on line 1.' }],
          result: 'Removes the document from MongoDB and verifies it existed.',
        },
        {
          marker: 'TODO 3:',
          goal: 'Export getTodos, createTodo, updateTodo, deleteTodo.',
          options: [
            { code: 'module.exports = { getTodos, createTodo, updateTodo, deleteTodo };', why: 'Exports the complete CRUD controller suite.' },
            { code: 'module.exports = { createTodo, updateTodo, deleteTodo };', why: 'Missing getTodos: the router needs all four handlers to wire GET /api/todos.' },
            { code: 'exports = { getTodos, createTodo, updateTodo, deleteTodo };', why: 'In Node.js, reassigning exports does not modify module.exports: the file would export an empty object.' },
          ],
          answer: 0,
          checks: ['exports'],
          sources: [
            { name: 'getTodos', from: 'here', find: 'const getTodos = async', note: 'Read handler.' },
            { name: 'createTodo', from: 'here', find: 'const createTodo = async', note: 'Create handler.' },
            { name: 'updateTodo', from: 'here', find: 'const updateTodo = async', note: 'Update handler.' },
            { name: 'deleteTodo', from: 'here', find: 'const deleteTodo = async', note: 'Delete handler.' },
          ],
          result: 'todoRoutes.js can require and wire all four operations.',
        },
      ],
    },
    {
      id: 'wire-routes',
      world: 'api',
      kind: 'edit',
      title: 'Wire the routes',
      summary: 'Map each HTTP method and URL to its controller.',
      lesson: `A router maps a method and a URL to a controller. Routes stay thin: no logic, just a pointer to the function that has it.

This router will be mounted at \`/api/todos\` (you'll do that in server.js next), so \`"/"\` here means \`/api/todos\` and \`"/:id"\` means \`/api/todos/<some id>\`. Express puts the \`:id\` part in \`req.params.id\`.

\`GET /\` is done. Add the other three routes.`,
      path: 'server/routes/todoRoutes.js',
      about: 'Maps URLs like GET /api/todos to controller functions.',
      starter: ROUTES_STARTER,
      solution: ROUTES_SOLUTION,
      checks: [
        { id: 'post', name: 'POST /api/todos creates a todo', hint: 'Follow the GET line: router.post("/", createTodo);', type: 'includes', value: 'router.post("/", createTodo)' },
        { id: 'put', name: 'PUT /api/todos/:id updates a todo', hint: 'The id is part of the path: router.put("/:id", updateTodo);', type: 'includes', value: 'router.put("/:id", updateTodo)' },
        { id: 'delete', name: 'DELETE /api/todos/:id deletes a todo', hint: 'router.delete("/:id", deleteTodo);', type: 'includes', value: 'router.delete("/:id", deleteTodo)' },
      ],
      gaps: [
        {
          marker: 'TODO: POST',
          goal: 'POST /api/todos must run createTodo.',
          options: [
            { code: 'router.post("/", createTodo());', why: 'The parentheses call createTodo once, right now, with no request, and give Express its result. Pass the function itself: Express calls it for every request.' },
            { code: 'router.get("/", createTodo);', why: 'GET / already lists the todos (line 7). Saving a todo is a POST.' },
            { code: 'router.post("/", createTodo);', why: 'Express calls createTodo(req, res) whenever a POST reaches /api/todos.' },
          ],
          answer: 2,
          checks: ['post'],
          sources: [
            { name: 'router', from: 'here', find: 'const router = express.Router()', note: 'The mini app made on this line. Its paths are relative to where server.js mounts it.' },
            { name: 'createTodo', from: 'file', path: 'server/controllers/todoController.js', find: 'const createTodo = async', note: 'Your handler from Build createTodo, imported on line 2.' },
          ],
          result: 'Express calls createTodo(req, res) for each POST, and createTodo sends the response.',
        },
        {
          marker: 'TODO: PUT',
          goal: 'PUT /api/todos/<id> must run updateTodo.',
          options: [
            { code: 'router.put("/:id", updateTodo);', why: ':id is a placeholder. For /api/todos/42, Express puts "42" in req.params.id.' },
            { code: 'router.put("/id", updateTodo);', why: 'Without the colon, the path only matches the word id itself: /api/todos/id. A real id like 42 never matches.' },
            { code: 'router.put("/", updateTodo);', why: 'The URL carries no id, so updateTodo cannot know which todo to change: req.params.id is undefined.' },
          ],
          answer: 0,
          checks: ['put'],
          sources: [{ name: 'updateTodo', from: 'file', path: 'server/controllers/todoController.js', find: 'const updateTodo = async', note: 'Written for you in the controller. It reads the id from req.params.id.' }],
          result: 'updateTodo finds the todo by req.params.id and sends back the updated one.',
        },
        {
          marker: 'TODO: DELETE',
          goal: 'DELETE /api/todos/<id> must run deleteTodo.',
          options: [
            { code: 'router.remove("/:id", deleteTodo);', why: 'Routers have no remove method: startup fails with "router.remove is not a function". The method is named after the HTTP verb, delete.' },
            { code: 'router.delete("/:id", deleteTodo);', why: 'Same shape as PUT: the verb, the path with :id, and the handler.' },
            { code: 'router.delete("/:id", createTodo);', why: 'A DELETE request would create a todo. The handler has to match the route.' },
          ],
          answer: 1,
          checks: ['delete'],
          sources: [{ name: 'deleteTodo', from: 'file', path: 'server/controllers/todoController.js', find: 'const deleteTodo = async', note: 'Written for you in the controller, and imported on line 2.' }],
          result: 'deleteTodo removes the todo named by req.params.id and answers { message, id }.',
        },
      ],
    },
    {
      id: 'server-entry',
      world: 'api',
      kind: 'edit',
      title: 'Write server.js',
      summary: 'Wire middleware, routes and the database together in the right order.',
      lesson: `server.js is the entry point: the file Node runs. It wires everything together, in an order that matters:
- load .env first, so process.env is ready for everything after it
- create the app and add middleware: functions that run on every request before your routes
- mount the routes
- connect to the database, and only then start listening

A route mounted before \`express.json()\` sees \`req.body\` as undefined, and a server that listens before the database is ready answers its first requests with errors.`,
      path: 'server/server.js',
      about: 'Entry point: loads .env, sets up Express, mounts the routes, connects to the DB, starts listening.',
      starter: SERVER_STARTER,
      solution: SERVER_SOLUTION,
      checks: [
        { id: 'json', name: 'Parses JSON request bodies', hint: 'Add app.use(express.json()); before the routes.', type: 'includes', value: 'app.use(express.json())' },
        { id: 'mount', name: 'Mounts the todo routes at /api/todos', hint: 'app.use takes a path prefix and a router: app.use("/api/todos", todoRoutes);', type: 'includes', value: 'app.use("/api/todos", todoRoutes)' },
        {
          id: 'listen-after-db',
          name: 'Starts listening only after the database connects',
          hint: 'connectDB() returns a Promise. Call app.listen(PORT, …) inside connectDB().then(() => { … }), or after await connectDB().',
          type: 'matches',
          value: /(?:connectDB\(\)\s*\.then\(|await\s+connectDB\(\))[\s\S]*app\.listen\(\s*PORT/.source,
        },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Parse JSON request bodies, so req.body holds what the client sent.',
          options: [
            { code: 'app.use(express.json);', why: 'Without the parentheses, Express gets the function that makes the middleware, not the middleware. Every request then hangs, waiting for a next() that never comes.' },
            { code: 'app.use(express.json());', why: 'express.json() makes the body parser, and app.use runs it on every request before the routes.' },
            { code: 'app.json();', why: 'app has no json method: startup fails with "app.json is not a function".' },
          ],
          answer: 1,
          checks: ['json'],
          sources: [
            { name: 'app', from: 'here', find: 'const app = express()', note: 'The Express app, created on this line.' },
            { name: 'express.json', from: 'import', find: 'require("express")', note: 'Part of the Express package, required on line 2: its built-in JSON body parser.' },
          ],
          result: 'Every later handler finds the parsed body in req.body: createTodo reads req.body.title.',
        },
        {
          marker: 'TODO 2:',
          goal: 'Mount the todo routes under /api/todos.',
          options: [
            { code: 'app.use(todoRoutes);', why: 'Mounted at the root, router.get("/") answers at / instead of /api/todos, and the React app calls a URL that does not exist.' },
            { code: 'app.get("/api/todos", todoRoutes);', why: 'app.get only passes GET requests for exactly /api/todos. POST, PUT and DELETE, and every /api/todos/<id>, never reach the router.' },
            { code: 'app.use("/api/todos", todoRoutes);', why: 'Every request starting with /api/todos goes to the router, with that prefix taken off: "/" in the router means /api/todos.' },
          ],
          answer: 2,
          checks: ['mount'],
          sources: [
            { name: 'todoRoutes', from: 'file', path: 'server/routes/todoRoutes.js', find: 'module.exports = router', note: 'The router you wired in the last level, required on line 5.' },
            { name: 'app.use', from: 'here', find: 'const app = express()', note: 'A method of the app made on this line: it mounts middleware or a router under a path.' },
          ],
          result: 'Requests to /api/todos/… now reach todoRoutes.js, which passes each one to its controller.',
        },
        {
          marker: 'TODO 3:',
          goal: 'Connect to the database first, and only then start listening on PORT.',
          options: [
            { code: 'connectDB().then(() => {\n  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));\n});', why: 'connectDB() returns a Promise. .then runs its function only once the Promise resolves, so the server listens only when MongoDB is connected.' },
            { code: 'app.listen(PORT, () => console.log(`Server running on port ${PORT}`));\nconnectDB();', why: 'The server takes requests before the database is connected, so the first ones fail.' },
            { code: 'connectDB.then(() => {\n  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));\n});', why: 'connectDB is the function; it only returns a Promise once you call it. Startup crashes with "connectDB.then is not a function".' },
          ],
          answer: 0,
          checks: ['listen-after-db'],
          sources: [
            { name: 'connectDB', from: 'file', path: 'server/config/db.js', find: 'module.exports = connectDB', note: 'Your async function from config/db.js, required on line 4. Calling it returns a Promise.' },
            { name: 'PORT', from: 'here', find: 'const PORT =', note: 'The port from .env, or 5000 when .env has none.' },
            { name: 'app', from: 'here', find: 'const app = express()', note: 'The Express app. app.listen starts accepting requests.' },
          ],
          result: 'The server prints "Server running on port 5000" once both are ready. If connecting fails, db.js exits instead.',
        },
      ],
    },
    {
      id: 'run-server',
      world: 'api',
      kind: 'command',
      title: 'Start the API',
      summary: 'Run the server with nodemon and call it with curl.',
      lesson: `Time to see it run. \`npm run dev\` starts nodemon, which runs server.js and restarts it whenever you save.

Then call the API the way the React app will. curl is a command-line HTTP client: \`-X\` picks the method, \`-H\` adds a header and \`-d\` sends a body.`,
      cwd: 'server',
      steps: [
        {
          goal: 'Start the server in development mode.',
          hint: 'Run the "dev" script you added to package.json.',
          accept: ['npm run dev'],
          output: '> server@1.0.0 dev\n> nodemon server.js\n\n[nodemon] 3.1.10\n[nodemon] to restart at any time, enter `rs`\n[nodemon] watching path(s): *.*\n[nodemon] watching extensions: js,mjs,cjs,json\n[nodemon] starting `node server.js`\nMongoDB connected\nServer running on port 5000',
          explain: 'In a real terminal this keeps running. You would open a second terminal for the next commands.',
        },
        {
          goal: 'List the todos with a GET request to http://localhost:5000/api/todos',
          hint: 'curl sends a GET request when you only give it a URL.',
          accept: ['curl http://localhost:5000/api/todos', 'curl -X GET http://localhost:5000/api/todos', 'curl localhost:5000/api/todos'],
          output: '[]',
          explain: 'An empty JSON array: the route, controller, model and database all answered. There are no todos yet.',
        },
        {
          goal: 'Create a todo titled "Learn MERN" with a POST request.',
          hint: `curl -X POST http://localhost:5000/api/todos -H "Content-Type: application/json" -d '{"title":"Learn MERN"}'`,
          accept: [`curl -X POST http://localhost:5000/api/todos -H "Content-Type: application/json" -d '{"title":"Learn MERN"}'`],
          pattern: /curl (?=.*localhost:5000\/api\/todos)(?=.*(?:-d|--data(?:-raw)?) )(?=.*Content-Type: application\/json)(?=.*title).*/.source,
          output: '{"title":"Learn MERN","completed":false,"_id":"66f1c2a9e4b0a1b2c3d4e5f6","createdAt":"2026-10-05T09:12:44.120Z","updatedAt":"2026-10-05T09:12:44.120Z","__v":0}',
          explain: '201 Created, with the saved document: MongoDB added _id, the timestamps you fixed in the model, and __v (Mongoose\'s version key).',
        },
      ],
    },
    {
      id: 'controller-bug-hunt',
      world: 'api',
      kind: 'bugfix',
      boss: true,
      title: 'Bug hunt: the broken controller',
      summary: 'Someone "refactored" the controller. Four API tests fail. Fix them.',
      lesson: `Your teammate "refactored" the controller on Friday evening. Now the list comes back empty, ticking a todo off does nothing, and deleting a todo that doesn't exist crashes with "Cannot set headers after they are sent to the client".

Four bugs, four failing API tests. createTodo is yours from earlier and still works: keep it that way.`,
      path: 'server/controllers/todoController.js',
      about: 'The logic for create, read, update and delete.',
      starter: CONTROLLER_BUGGY,
      solution: CONTROLLER,
      checks: [
        { id: 'get-await', name: 'GET /api/todos returns the list, not a pending Promise', hint: 'Todo.find() returns a query that has to be awaited. Without await, res.json receives the query object and sends {}.', type: 'includes', value: 'const todos = await Todo.find()' },
        { id: 'post-201', name: 'POST /api/todos still responds 201 with the todo', hint: 'createTodo was fine. Put back return res.status(201).json(todo);', type: 'includes', value: 'return res.status(201).json(todo)' },
        { id: 'put-param', name: 'PUT /api/todos/:id updates the todo named in the URL', hint: 'The id is part of the URL (/:id), so it lives in req.params.id. req.body.id is undefined.', type: 'includes', value: 'findByIdAndUpdate(req.params.id' },
        {
          id: 'put-new',
          name: 'PUT /api/todos/:id responds with the updated todo',
          hint: 'findByIdAndUpdate resolves to the document as it was BEFORE the update unless you ask for the new one: add new: true to the options.',
          type: 'matches',
          value: /findByIdAndUpdate\([^;]*(?:new:\s*true|returnDocument:\s*["']after["'])/.source,
        },
        {
          id: 'delete-return',
          name: 'DELETE /api/todos/:id stops after a 404',
          hint: 'Without return, the code carries on past res.status(404), reads todo._id on null, and the catch block tries to send a second response.',
          type: 'matches',
          value: /findByIdAndDelete[\s\S]*?if\s*\(\s*!todo\s*\)\s*\{\s*return\s+res\.status\(404\)/.source,
        },
      ],
    },

    // ---- World 4: React Castle -------------------------------------------------------------
    {
      id: 'create-client',
      world: 'react',
      kind: 'command',
      title: 'Scaffold the React app',
      summary: 'Let Vite generate the client, then install axios.',
      lesson: `The client is a separate app with its own package.json. Vite generates a ready-to-run React project in seconds: an index.html, a src/ folder with main.jsx and App.jsx, and a config file.

Vite also writes files for its demo page that this project never uses: a README, a lint config, a stylesheet and a logo. The explorer shows them with a lock. They stay in the project, as they would on your computer, but you never need to open them.

Watch the explorer fill up as Vite writes the files, then install axios, the HTTP client the services layer will use.`,
      cwd: 'server',
      steps: [
        { goal: 'Go back up to the project root.', hint: 'cd .. moves up one folder.', accept: ['cd ..', 'cd ../'], cwd: '' },
        {
          goal: 'Create a React app in a folder called client, using Vite.',
          hint: 'npm create vite@latest <folder> -- --template react',
          accept: ['npm create vite@latest client -- --template react', 'npm create vite@latest client --template react', 'npm create vite client -- --template react'],
          output: '> npx\n> create-vite client --template react\n\n│\n◇  Scaffolding project in /todo-app/client...\n│\n└  Done. Now run:\n\n  cd client\n  npm install\n  npm run dev',
          adds: [
            { path: 'client/index.html', about: 'The page the browser loads. It pulls in src/main.jsx.', content: INDEX_HTML },
            { path: 'client/package.json', about: "The client's ID card: Vite scripts and React dependencies.", content: clientPackage(false) },
            { path: 'client/vite.config.js', about: 'Vite settings: the React plugin.', content: VITE_CONFIG },
            { path: 'client/eslint.config.js', about: 'Lint rules Vite sets up for React. This journey never runs the linter.', content: ESLINT_CONFIG, unused: true },
            { path: 'client/README.md', about: "Vite's notes about its template. The project's own README.md, at the root, is the one that matters.", content: VITE_README, unused: true },
            { path: 'client/.gitignore', about: 'Files git ignores inside client/.', content: CLIENT_GITIGNORE },
            { path: 'client/public/vite.svg', about: 'The favicon.', content: VITE_SVG },
            { path: 'client/src/main.jsx', about: 'Renders <App /> into the #root div of index.html.', content: MAIN_JSX },
            { path: 'client/src/App.jsx', about: "Vite's demo component. You'll replace it.", content: VITE_APP },
            { path: 'client/src/App.css', about: "Styles for Vite's demo page. Your App.jsx won't import it.", content: APP_CSS, unused: true },
            { path: 'client/src/index.css', about: 'Global styles.', content: VITE_INDEX_CSS },
            { path: 'client/src/assets/react.svg', about: "The React logo on Vite's demo page. Your App.jsx won't show it.", content: REACT_SVG, unused: true },
          ],
          explain: 'index.html is the page the browser loads. It loads src/main.jsx, which renders App into <div id="root">. The locked files are part of Vite\'s demo; this project never uses them.',
        },
        { goal: 'Move into client.', hint: 'Same as before: cd and the folder name.', accept: ['cd client', 'cd ./client', 'cd client/'], cwd: 'client' },
        {
          goal: 'Install the packages Vite listed in package.json.',
          hint: 'npm install with no package names installs everything package.json lists.',
          accept: ['npm install'],
          output: 'added 157 packages, and audited 158 packages in 9s\n\n33 packages are looking for funding\n  run `npm fund` for details\n\nfound 0 vulnerabilities',
          adds: [
            { path: 'client/package-lock.json', about: LOCK_ABOUT, content: lockfile('client'), generated: true },
            { path: 'client/node_modules/', about: NODE_MODULES_ABOUT, generated: true },
          ],
        },
        {
          goal: 'Install axios.',
          hint: 'npm install and the package name.',
          accept: ['npm install axios'],
          output: 'added 9 packages, and audited 167 packages in 2s\n\nfound 0 vulnerabilities',
          adds: [{ path: 'client/package.json', about: "The client's ID card: Vite scripts and React dependencies.", content: clientPackage(true) }],
          explain: 'axios turns a function call into an HTTP request and parses the JSON response for you.',
        },
      ],
    },
    {
      id: 'api-service',
      world: 'react',
      kind: 'edit',
      title: 'One place to call the API',
      summary: 'Write services/api.js so components never deal with URLs.',
      lesson: `Components shouldn't know URLs. If every component called axios with "http://localhost:5000/api/todos", moving the server would mean editing every file.

services/api.js is the one place the client talks to the backend. It creates an axios instance with the base URL once, and exports one small function per endpoint, so components just call \`getTodos()\` or \`createTodo(title)\`.

Each function returns \`response.data\`, the parsed JSON body. \`getTodos\` is done: write the other three.`,
      path: 'client/src/services/api.js',
      about: 'The one place on the client that talks to the backend.',
      starter: API_STARTER,
      solution: API_SOLUTION,
      checks: [
        { id: 'create', name: 'createTodo(title) posts { title } and returns the new todo', hint: 'Copy the shape of getTodos and return .data: export const createTodo = async (title) => (await api.post("/todos", { title })).data;', type: 'matches', value: /export\s+const\s+createTodo\b[^;]*?\(\s*await\s+api\.post\(\s*["']\/todos["']\s*,\s*\{\s*title\s*\}\s*\)\s*\)\s*\.data/.source },
        { id: 'update', name: 'updateTodo(id, changes) puts to /todos/:id and returns the updated todo', hint: 'Build the URL from the id with a template literal, and return .data: (await api.put(`/todos/${id}`, changes)).data', type: 'matches', value: /export\s+const\s+updateTodo\b[^;]*?\(\s*await\s+api\.put\(\s*(?:`\/todos\/\$\{id\}`|["']\/todos\/["']\s*\+\s*id)\s*,\s*changes\s*\)\s*\)\s*\.data/.source },
        { id: 'delete', name: 'deleteTodo(id) deletes /todos/:id', hint: 'api.delete(`/todos/${id}`)', type: 'matches', value: /export\s+const\s+deleteTodo\b[\s\S]*?api\.delete\(\s*(?:`\/todos\/\$\{id\}`|["']\/todos\/["']\s*\+\s*id)\s*\)/.source },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'createTodo(title) sends POST /todos with { title } and returns the new todo.',
          options: [
            { code: 'export const createTodo = async (title) => (await api.post("/todos", { title })).data;', why: 'The same shape as getTodos: await the request, then hand back response.data, the todo the server saved.' },
            { code: 'export const createTodo = async (title) => { await api.post("/todos", { title }); };', why: 'With braces, an arrow function needs an explicit return. This one returns undefined, so App never gets the new todo and cannot show it.' },
            { code: 'export const createTodo = async (title) => (await api.post("/todos", title)).data;', why: 'The server reads req.body.title, so the body must be an object with a title in it: { title }. A bare string arrives without a name.' },
          ],
          answer: 0,
          checks: ['create'],
          sources: [
            { name: 'api', from: 'here', find: 'const api = axios.create', note: 'The axios instance from this line. Its baseURL turns "/todos" into http://localhost:5000/api/todos.' },
            { name: 'getTodos', from: 'here', find: 'export const getTodos', note: 'Already written: the pattern to copy.' },
            { name: 'title', from: 'param', note: 'The parameter. Whoever calls createTodo("Buy milk") hands it in.' },
          ],
          result: 'Returns response.data: the saved todo, with its _id. App.jsx\'s handleAdd puts it at the top of the list.',
        },
        {
          marker: 'TODO 2:',
          goal: 'updateTodo(id, changes) sends PUT /todos/<id> with the changes and returns the updated todo.',
          options: [
            { code: 'export const updateTodo = async (id, changes) => (await api.put("/todos/id", changes)).data;', why: '"/todos/id" is the word id, not its value. A template literal puts the real id in the URL: `/todos/${id}`.' },
            { code: 'export const updateTodo = async (id, changes) => (await api.put(`/todos/${id}`, changes)).data;', why: 'Backticks with ${id} build /todos/66f1… from the id, and .data hands back the updated todo.' },
            { code: 'export const updateTodo = async (id, changes) => await api.put(`/todos/${id}`, changes);', why: 'This returns the whole axios response: status, headers, config. App needs only the todo inside it, response.data.' },
          ],
          answer: 1,
          checks: ['update'],
          sources: [
            { name: 'api', from: 'here', find: 'const api = axios.create', note: 'The same axios instance.' },
            { name: 'id, changes', from: 'param', note: 'The parameters. App.jsx calls updateTodo(todo._id, { completed: true }).' },
            { name: '`/todos/${id}`', from: 'builtin', note: 'A JavaScript template literal: inside backticks, ${…} drops a value into the text.' },
          ],
          result: 'Returns the updated todo. App swaps it into the list in place of the old one.',
        },
        {
          marker: 'TODO 3:',
          goal: 'deleteTodo(id) sends DELETE /todos/<id>.',
          options: [
            { code: 'export const deleteTodo = async (id) => (await api.delete("/todos", id)).data;', why: "The id has to be part of the URL. axios's second argument is a settings object, so this sends DELETE /todos with no id." },
            { code: 'export const deleteTodo = async (id) => (await api.post(`/todos/${id}/delete`)).data;', why: 'The server has no POST route for that. todoRoutes.js answers DELETE /:id.' },
            { code: 'export const deleteTodo = async (id) => (await api.delete(`/todos/${id}`)).data;', why: 'The DELETE verb and the id in the URL: exactly what router.delete("/:id") on the server waits for.' },
          ],
          answer: 2,
          checks: ['delete'],
          sources: [
            { name: 'api', from: 'here', find: 'const api = axios.create', note: 'The same axios instance.' },
            { name: 'router.delete', from: 'file', path: 'server/routes/todoRoutes.js', find: 'router.delete(', note: 'The server route this request reaches.' },
          ],
          result: "Returns the server's { message, id }. App does not need it: it removes the todo from its list itself.",
        },
      ],
    },
    {
      id: 'components',
      world: 'react',
      kind: 'explore',
      title: 'Meet the components',
      summary: 'TodoForm adds, TodoList shows, TodoItem is one row.',
      lesson: `React screens are built from components: functions that take props and return what to draw.

- \`TodoForm\` owns the text box and calls \`onAdd(title)\` when the form is submitted.
- \`TodoList\` receives the array of todos and renders one \`TodoItem\` per todo.
- \`TodoItem\` shows one todo with a checkbox and a delete button. It never changes data itself: it calls \`onToggle\` and \`onDelete\`, which App passes down.

Data flows down as props; events flow up as callbacks. The list itself lives in App's state, which you will repair in the next level. Open each new file, then answer the question.`,
      adds: [
        { path: 'client/src/components/TodoForm.jsx', about: 'The input and Add button. Calls onAdd(title).', content: TODO_FORM },
        { path: 'client/src/components/TodoItem.jsx', about: 'One todo: a checkbox and a delete button.', content: TODO_ITEM },
        { path: 'client/src/components/TodoList.jsx', about: 'Renders one TodoItem per todo.', content: TODO_LIST },
        { path: 'client/src/index.css', about: 'Global styles for the todo app.', content: TODO_INDEX_CSS },
      ],
      quiz: {
        question: 'Where does the list of todos live while the app is running?',
        options: ['Inside each TodoItem', "In App's state, passed down to TodoList as a prop", 'In services/api.js'],
        answer: 1,
        explain: 'App keeps the array in useState and passes it down. TodoItem only displays one todo, and api.js only talks to the server.',
      },
    },
    {
      id: 'react-bug-hunt',
      world: 'react',
      kind: 'bugfix',
      boss: true,
      title: 'Bug hunt: App.jsx',
      summary: 'Infinite requests, todos that never appear, a delete that deletes everything.',
      lesson: `App.jsx ties the client together: it keeps the todos in state, loads them when the page opens, and passes handlers down to the components.

This version has four classic React bugs:
- the browser's network tab shows thousands of requests
- new todos don't appear until you refresh
- deleting one todo makes all the others disappear
- ticking a checkbox sends PUT /api/todos/undefined

Fix them so every test passes. Remember: never change state in place, always hand React a new array.`,
      path: 'client/src/App.jsx',
      about: 'The root component: holds the todos and the handlers.',
      starter: APP_BUGGY,
      solution: APP_SOLUTION,
      checks: [
        { id: 'effect-once', name: 'Loads the todos once, not after every render', hint: 'An effect without a dependency array runs after every render. setTodos causes a render, which runs the effect again: an endless loop of requests. Pass [] as the second argument to run it once.', type: 'matches', value: /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?\}\s*,\s*\[\s*\]\s*\)/.source },
        { id: 'no-mutation', name: 'Adding a todo does not mutate state', hint: 'todos.push changes the array React already has. Then setTodos(todos) hands back the same array, so React sees no change and skips the render.', type: 'notMatches', value: /todos\.push\(/.source },
        { id: 'add-renders', name: 'New todos appear straight away', hint: 'Give React a new array with the todo in it: setTodos((current) => [todo, ...current]);', type: 'matches', value: /setTodos\(\s*(?:\(?\s*(\w+)\s*\)?\s*=>\s*)?\[\s*(?:todo\s*,\s*\.\.\.\s*(?:\1|todos)|\.\.\.\s*(?:\1|todos)\s*,\s*todo)\s*\]\s*\)/.source },
        { id: 'delete-filter', name: 'Deleting removes only that todo', hint: 'filter keeps the items for which the function returns true. Keep every todo whose _id is NOT the deleted id: !==', type: 'matches', value: /filter\(\s*\(?\s*(\w+)\s*\)?\s*=>\s*(?:\1\._id\s*!==?\s*id|id\s*!==?\s*\1\._id)\s*\)/.source },
        { id: 'toggle-id', name: 'Toggling sends the MongoDB _id', hint: 'MongoDB calls the id field _id. todo.id is undefined, so the request goes to /api/todos/undefined.', type: 'includes', value: 'updateTodo(todo._id' },
      ],
    },

    // ---- World 5: Test Lab -----------------------------------------------------------------
    {
      id: 'install-jest',
      world: 'testing',
      kind: 'command',
      title: 'Set up Jest',
      summary: 'Install the test runner and point npm test at it.',
      lesson: `Tests are code that checks your code. Jest is the most common test runner for Node: it finds files ending in .test.js, runs them and reports what passed.

You will test the controller without a real database. Jest can swap a module for a fake (a "mock"), so a test can say "pretend Todo.create returns this" and check how the controller reacts.`,
      cwd: 'client',
      steps: [
        { goal: 'Go to the server folder.', hint: 'From client/, the server is up one folder and then into server.', accept: ['cd ../server', 'cd ..\\server'], cwd: 'server' },
        {
          goal: 'Install jest as a development dependency.',
          hint: 'Same flag as nodemon: --save-dev (or -D).',
          accept: ['npm install --save-dev jest'],
          output: 'added 266 packages, and audited 388 packages in 11s\n\n44 packages are looking for funding\n  run `npm fund` for details\n\nfound 0 vulnerabilities',
          adds: [{ path: 'server/package.json', about: "The server's ID card: name, scripts and dependencies.", content: serverPackage('jest') }],
        },
        {
          goal: 'Make "npm test" run jest.',
          hint: 'Same trick as the dev script: npm pkg set scripts.test=…',
          accept: ['npm pkg set scripts.test="jest"', 'npm pkg set scripts.test=jest'],
          adds: [{ path: 'server/package.json', about: "The server's ID card: name, scripts and dependencies.", content: serverPackage('test') }],
          explain: 'npm test now runs jest instead of printing "no test specified".',
        },
      ],
    },
    {
      id: 'first-test',
      world: 'testing',
      kind: 'edit',
      title: 'Write your first test',
      summary: 'Finish the assertions for createTodo with a mocked model.',
      lesson: `A test has three parts: arrange the inputs, act by calling the code, assert on what happened.

The controller expects Express's \`req\` and \`res\`. In a test you pass plain objects instead: \`req\` is just \`{ body: {...} }\`, and \`res\` is a fake whose \`status\` and \`json\` are \`jest.fn()\` mocks that remember how they were called.

\`expect(mock).toHaveBeenCalledWith(value)\` asserts a mock was called with that value, and \`.not\` flips any assertion. Fill in the four missing assertions.`,
      path: 'server/tests/todoController.test.js',
      about: 'Unit tests for createTodo, with the database mocked out.',
      starter: TEST_STARTER,
      solution: TEST_SOLUTION,
      checks: [
        { id: 'status-400', name: 'Asserts the 400 status', hint: 'expect(res.status).toHaveBeenCalledWith(400);', type: 'includes', value: 'expect(res.status).toHaveBeenCalledWith(400)' },
        { id: 'no-create', name: 'Asserts bad input never reaches the database', hint: 'expect(Todo.create).not.toHaveBeenCalled();', type: 'includes', value: 'expect(Todo.create).not.toHaveBeenCalled()' },
        { id: 'status-201', name: 'Asserts the 201 status', hint: 'expect(res.status).toHaveBeenCalledWith(201);', type: 'includes', value: 'expect(res.status).toHaveBeenCalledWith(201)' },
        { id: 'json-saved', name: 'Asserts the saved todo is sent back', hint: 'expect(res.json).toHaveBeenCalledWith(saved);', type: 'includes', value: 'expect(res.json).toHaveBeenCalledWith(saved)' },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Check that the controller answered 400.',
          options: [
            { code: 'expect(res.status).toBe(400);', why: 'res.status is a mock function, not a number. Ask what it was called with: toHaveBeenCalledWith(400).' },
            { code: 'expect(res.status).toHaveBeenCalledWith(400);', why: 'The mock remembers every call, so this checks the controller called res.status(400).' },
            { code: 'expect(res.status(400)).toBeTruthy();', why: 'This calls res.status yourself, so it passes whatever the controller did. A test looks at what already happened.' },
          ],
          answer: 1,
          checks: ['status-400'],
          sources: [
            { name: 'res', from: 'here', find: 'const res = mockResponse()', note: 'The fake response. mockResponse, near the top of this file, made status and json mock functions.' },
            { name: 'expect', from: 'builtin', note: 'Jest provides it in every test file: nothing to import.' },
            { name: 'toHaveBeenCalledWith', from: 'builtin', note: 'A Jest check for mock functions: passes when the mock was called with those arguments.' },
          ],
          result: 'If it fails, Jest marks the test red and prints what res.status was really called with.',
        },
        {
          marker: 'TODO 2:',
          goal: 'Check that Todo.create was never called: bad input never reaches the database.',
          options: [
            { code: 'expect(Todo.create).toHaveBeenCalled();', why: 'That asserts the opposite: that the database was written. Add .not.' },
            { code: 'expect(Todo.create()).not.toHaveBeenCalled();', why: 'Todo.create() calls the mock yourself, then asks about its return value, which is not a mock. Pass the function itself to expect.' },
            { code: 'expect(Todo.create).not.toHaveBeenCalled();', why: '.not flips the check: it passes only if the controller never called Todo.create.' },
          ],
          answer: 2,
          checks: ['no-create'],
          sources: [{ name: 'Todo', from: 'import', find: 'const Todo = require("../models/Todo")', note: 'Required here, but jest.mock (two lines down) swapped it for a fake whose create is jest.fn().' }],
        },
        {
          marker: 'TODO 3:',
          goal: 'Check that the controller answered 201 Created.',
          options: [
            { code: 'expect(res.status).toHaveBeenCalledWith(201);', why: '201 is the status createTodo sends after saving.' },
            { code: 'expect(res.status).toHaveBeenCalledWith(200);', why: '200 is plain OK. createTodo answers 201, the status for "created".' },
            { code: 'expect(res.statusCode).toBe(201);', why: 'The fake res has no statusCode. The controller calls res.status(201), and that call is what the mock records.' },
          ],
          answer: 0,
          checks: ['status-201'],
          sources: [{ name: 'res', from: 'here', find: 'const res = mockResponse()', note: 'A fresh fake response for this test.' }],
        },
        {
          marker: 'TODO 4:',
          goal: 'Check that the saved todo was sent back with res.json.',
          options: [
            { code: 'expect(res.json).toHaveBeenCalledWith({ title: "Learn MERN" });', why: 'The controller sends what Todo.create resolved to: saved, with its _id. The client needs that id to update or delete the todo later.' },
            { code: 'expect(res.json).toHaveBeenCalledWith(saved);', why: 'saved is what the fake Todo.create resolves to, so this checks the controller passed it straight to res.json.' },
            { code: 'expect(res.send).toHaveBeenCalledWith(saved);', why: 'The controller answers with res.json, and the fake res has no send at all.' },
          ],
          answer: 1,
          checks: ['json-saved'],
          sources: [
            { name: 'saved', from: 'here', find: 'const saved = {', note: 'What the fake Todo.create resolves to, set up on the next line.' },
            { name: 'res.json', from: 'here', find: 'res.json = jest.fn()', note: 'mockResponse made json a mock, so it remembers every call.' },
          ],
        },
      ],
    },
    {
      id: 'run-tests',
      world: 'testing',
      kind: 'command',
      title: 'Run the tests',
      summary: 'Run the suite, then see which lines it covers.',
      lesson: `Run the suite. Green means the controller behaves the way your tests say it should, and keeps behaving that way: run them before every commit and a broken change can't sneak in.

Coverage then shows which lines your tests actually ran. It is a map of what is still untested, not a score to chase.`,
      cwd: 'server',
      steps: [
        {
          goal: 'Run the test suite.',
          hint: 'npm has a shortcut for the "test" script: no "run" needed.',
          accept: ['npm test', 'npm run test', 'npm t'],
          output: '> server@1.0.0 test\n> jest\n\n PASS  tests/todoController.test.js\n  createTodo\n    ✓ rejects a missing title with 400 (3 ms)\n    ✓ creates the todo and responds 201 (1 ms)\n\nTest Suites: 1 passed, 1 total\nTests:       2 passed, 2 total\nSnapshots:   0 total\nTime:        0.412 s\nRan all test suites.',
          explain: 'Both tests pass, and no database was needed.',
        },
        {
          goal: 'Run the tests again with a coverage report.',
          hint: 'Arguments after -- go to jest itself: npm test -- --coverage',
          accept: ['npm test -- --coverage', 'npx jest --coverage', 'npm run test -- --coverage'],
          output: '> server@1.0.0 test\n> jest --coverage\n\n PASS  tests/todoController.test.js\n\n-------------------|---------|----------|---------|---------|-------------------\nFile               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s\n-------------------|---------|----------|---------|---------|-------------------\nAll files          |   36.36 |    41.66 |      25 |   36.36 |\n todoController.js |   36.36 |    41.66 |      25 |   36.36 | 5-10,24,31-55\n-------------------|---------|----------|---------|---------|-------------------',
          adds: [{ path: 'server/coverage/', about: 'The coverage report Jest generated. Ignored by git.', generated: true }],
          explain: 'Only createTodo is tested, so getTodos, updateTodo and deleteTodo show up as uncovered lines. Testing them is a good next step.',
        },
      ],
    },

    // ---- World 6: Production City ----------------------------------------------------------
    {
      id: 'ship-it',
      world: 'production',
      kind: 'command',
      title: 'Commit your work',
      summary: 'Make the project a git repository, tell git who you are, and record the first commit.',
      lesson: `Git records snapshots of your project called commits. You make one in three moves: create the repository (once), stage the files that go in the snapshot, then commit them with a message that says what changed.

Every commit is stamped with an author. The first time you use git on a computer, give it your name and email with \`git config --global\`. Use the email on your GitHub account, so GitHub links your commits to your profile.

.gitignore keeps node_modules/, .env and coverage/ out of every commit.

In the next level you send this commit to GitHub.`,
      cwd: 'server',
      steps: [
        { goal: 'Go back to the project root.', hint: 'One folder up.', accept: ['cd ..', 'cd ../'], cwd: '' },
        { goal: 'Create a git repository here.', hint: 'git, then the word for "start".', accept: ['git init'], output: 'Initialized empty Git repository in /todo-app/.git/', adds: [{ path: '.git/', about: "Git's database of every commit. Never edit it by hand.", generated: true }] },
        ...GIT_IDENTITY,
        { goal: 'Stage every file.', hint: 'git add with a dot stages everything under the current folder.', accept: ['git add .', 'git add -A', 'git add --all'], explain: 'Nothing is printed: staging is silent. git status would list the staged files.' },
        {
          goal: 'Commit with a message, for example "feat: MERN todo app".',
          hint: 'git commit -m "your message"',
          accept: ['git commit -m "feat: MERN todo app"'],
          pattern: 'git commit -m ".+"',
          output: '[main (root-commit) 3f9c2ab] feat: MERN todo app\n 25 files changed, 594 insertions(+)',
          explain: 'One commit, every file, stamped with your name. Next, send it to GitHub so it lives somewhere other than your laptop.',
        },
      ],
    },
    {
      id: 'push-github',
      world: 'production',
      kind: 'command',
      title: 'Push to GitHub',
      summary: 'Create a token, connect your repository to GitHub and push your commit.',
      lesson: pushLesson('todo-app'),
      cwd: '',
      steps: pushSteps('todo-app', 39),
    },
    {
      id: 'trace-request',
      world: 'production',
      kind: 'architecture',
      boss: true,
      title: 'Final boss: trace a request',
      summary: 'Put every stop of "add a todo" in order, from click to database.',
      lesson: `You have built every piece. Now prove you know how they connect.

A user types "Buy milk" and presses Add. Put the stops that request passes through in order, from the React component to the database. Each card lists the files that do that job: open them if you need a reminder.`,
      nodes: [
        { id: 'component', label: 'React component', role: 'TodoForm calls onAdd("Buy milk"), and App\'s handleAdd calls createTodo.', files: ['client/src/components/TodoForm.jsx', 'client/src/App.jsx'] },
        { id: 'api', label: 'api.js', role: 'axios sends POST http://localhost:5000/api/todos with { title } as JSON.', files: ['client/src/services/api.js'] },
        { id: 'route', label: 'Route', role: 'server.js parses the JSON and passes /api/todos to the router, which matches POST / to createTodo.', files: ['server/server.js', 'server/routes/todoRoutes.js'] },
        { id: 'controller', label: 'Controller', role: 'createTodo validates the title and asks the model to save it.', files: ['server/controllers/todoController.js'] },
        { id: 'model', label: 'Model', role: 'Todo checks the document against the schema and writes it over the shared connection.', files: ['server/models/Todo.js', 'server/config/db.js'] },
        { id: 'database', label: 'MongoDB', role: 'Stores the document in the todos collection and returns it with an _id.', files: ['server/.env'] },
      ],
      returnTrip: 'Then back the same way: MongoDB hands the saved document to the model, the controller responds 201 with it, api.js returns response.data, handleAdd puts it into state, and React re-renders the list.',
    },
  ],
  glossary: GLOSSARY,
}

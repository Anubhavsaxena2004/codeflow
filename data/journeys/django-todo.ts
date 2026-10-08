import type { ScaffoldLine } from '@/data/challenges'
import type { JourneyTerm, Project } from '@/lib/journeys/types'
import { GIT_IDENTITY, GIT_TERMS, pushLesson, pushSteps } from './git'

// Django Todo App, built as a monolith: one project holds the URLs, views, models and the HTML
// templates, with no separate frontend. Every startproject/startapp/makemigrations command
// generates the files the real one does. The ones this project never uses (asgi.py, admin.py)
// are marked unused, so the explorer shows them locked.

const line = (text: string): ScaffoldLine => ({ type: 'line', text })
const lines = (text: string) => text.split('\n').map(line)
const slot = (number: number, indent: number): ScaffoldLine => ({ type: 'slot', slot: number, indent })

// ---- root ---------------------------------------------------------------------------------
const README = `# Todo App (Django)

A todo list built as a Django monolith: one project holds the URLs, the logic, the data and the HTML pages. There is no separate frontend; Django draws every page on the server.

## Folder structure

    todo-django/
    ├── manage.py                  # Django's command-line tool
    ├── config/                    # the project: settings and the root URL table
    │   ├── settings.py
    │   ├── urls.py
    │   ├── asgi.py                # unused here
    │   └── wsgi.py
    ├── todos/                     # the app: one feature
    │   ├── models.py              # the Todo table
    │   ├── forms.py               # checks what people type
    │   ├── views.py               # list, create, toggle, delete
    │   ├── urls.py                # path → view
    │   ├── tests.py
    │   ├── admin.py               # unused here
    │   ├── migrations/            # database changes, generated from models.py
    │   ├── templates/todos/       # base.html, todo_list.html, todo_form.html
    │   └── static/todos/          # css/style.css, js/script.js
    ├── requirements.txt
    ├── .gitignore
    └── README.md

## How the pieces connect

- models.py: what a todo is (title, completed, created_at)
- forms.py: turns what people type into a valid Todo
- views.py: the logic. Each view takes a request and returns a response
- urls.py: maps paths like /add/ to views
- templates/: the HTML. Views fill it with data
- static/: CSS and JavaScript, sent to the browser as they are

Request flow: browser → config/urls.py → todos/urls.py → view → model → database, then the view renders a template and Django sends the finished HTML back.

## Where each file comes from

Commands write some files; you write the rest. A few files are made by a command but never used by this project (marked unused). They stay in the repository, as in any real project, but you never need to open them.

    python -m venv venv
        └── venv/                                    generated, never committed
    pip freeze > requirements.txt
        └── requirements.txt
    django-admin startproject config .
        ├── manage.py
        ├── config/__init__.py
        ├── config/settings.py
        ├── config/urls.py
        ├── config/wsgi.py
        └── config/asgi.py                           unused
    python manage.py startapp todos
        ├── todos/__init__.py
        ├── todos/apps.py
        ├── todos/models.py
        ├── todos/views.py
        ├── todos/tests.py
        ├── todos/migrations/__init__.py
        └── todos/admin.py                           unused
    python manage.py makemigrations
        └── todos/migrations/0001_initial.py
    python manage.py migrate
        └── db.sqlite3                               generated, never committed
    written by you
        ├── todos/forms.py
        ├── todos/urls.py
        ├── todos/templates/todos/base.html
        ├── todos/templates/todos/todo_list.html
        ├── todos/templates/todos/todo_form.html
        ├── todos/static/todos/css/style.css
        └── todos/static/todos/js/script.js

## Run it on your computer

You need Python 3.10 or newer and Git.

### 1. Get the code

    git clone https://github.com/your-username/todo-django.git
    cd todo-django

### 2. Create the virtual environment and install Django

    python -m venv venv
    source venv/bin/activate          # Windows: venv\\Scripts\\activate
    pip install -r requirements.txt

### 3. Create the tables and start the server

    python manage.py migrate
    python manage.py runserver        # http://127.0.0.1:8000/

### 4. Run the tests

    python manage.py test

## Push it to GitHub

### 1. Create an empty repository

On github.com, click + → New repository. Name it todo-django and leave "Add a README file" unticked, so the repository starts empty.

### 2. Create a personal access token

GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token. Tick the repo scope, pick an expiry, then generate it and copy it: GitHub shows it only once. Git asks for it instead of your password.

### 3. Commit and push

From the todo-django folder:

    git init
    git config --global user.name "Your Name"          # once per computer
    git config --global user.email "you@example.com"   # the email on your GitHub account
    git add .
    git commit -m "feat: Django todo app"
    git remote add origin https://github.com/your-username/todo-django.git
    git branch -M main
    git push -u origin main                             # password: paste the token

After that, every change is three commands:

    git add .
    git commit -m "fix: describe the change"
    git push

Never commit venv/, db.sqlite3 or .env: .gitignore keeps them out. If a token leaks, delete it on GitHub and make a new one.
`

const GITIGNORE = `# The virtual environment is rebuilt from requirements.txt
venv/

# Compiled Python, rebuilt automatically
__pycache__/
*.pyc

# Local database and secrets
db.sqlite3
.env

# Test coverage output
.coverage
htmlcov/
`

// ---- config/: what startproject writes ----------------------------------------------------
const MANAGE_PY = `#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
`

const SETTINGS = `"""
Django settings for config project.
"""

from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-change-me-before-you-deploy'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

ALLOWED_HOSTS = []


# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Internationalization

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)

STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
`

const SETTINGS_WITH_APP = SETTINGS.replace("    'django.contrib.staticfiles',\n]", "    'django.contrib.staticfiles',\n    'todos',\n]")

const URLS_HEAD = `"""
URL configuration for config project.

The urlpatterns list routes URLs to views.
"""
from django.contrib import admin`

const URLS = `${URLS_HEAD}
from django.urls import path

urlpatterns = [
    path('admin/', admin.site.urls),
]
`

const URLS_STARTER = `${URLS_HEAD}
# TODO 1: import include from django.urls as well, on the line below
from django.urls import path

urlpatterns = [
    path('admin/', admin.site.urls),
    # TODO 2: hand every other URL to todos/urls.py, mounted at the site root ('')
]
`

const URLS_SOLUTION = `${URLS_HEAD}
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('todos.urls')),
]
`

const serverEntry = (kind: 'asgi' | 'wsgi') => `"""
${kind.toUpperCase()} config for config project.

It exposes the ${kind.toUpperCase()} callable as a module-level variable named application.
"""

import os

from django.core.${kind} import get_${kind}_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_${kind}_application()
`

// ---- todos/: the app ----------------------------------------------------------------------
const APPS_PY = `from django.apps import AppConfig


class TodosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'todos'
`

const MODEL_SOLUTION = `from django.db import models


class Todo(models.Model):
    title = models.CharField(max_length=200)
    completed = models.BooleanField(default=False)
    # Set once, when the row is created
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title
`

const MODEL_BUGGY = MODEL_SOLUTION.replace('class Todo(models.Model)', 'class Todo(models.model)')
  .replace('models.CharField(max_length=200)', 'models.CharField()')
  .replace('DateTimeField(auto_now_add=True)', 'DateTimeField(auto_now=True)')
  .replace('        return self.title', '        print(self.title)')

const MIGRATION = `# Generated by Django 5.2.7 on 2026-10-05 09:30

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Todo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('completed', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
    ]
`

const FORM_STARTER = `from django import forms

# TODO 1: import the Todo model from models.py in this app (a relative import)


# A ModelForm builds its fields and validation from a model, so the rules live in one place
class TodoForm(forms.ModelForm):
    class Meta:
        # TODO 2: the model this form saves
        # TODO 3: the fields people fill in: only title, as a list
        pass
`

const FORM_SOLUTION = `from django import forms

from .models import Todo


# A ModelForm builds its fields and validation from a model, so the rules live in one place
class TodoForm(forms.ModelForm):
    class Meta:
        model = Todo
        fields = ['title']
`

const VIEWS_READ_STARTER = `# TODO 1: import get_object_or_404, redirect, render from django.shortcuts, and require_POST from django.views.decorators.http

# TODO 2: import TodoForm from .forms and Todo from .models


# GET /: every todo, newest first (Meta.ordering in models.py sorts them)
def todo_list(request):
    # TODO 3: get all todos with Todo.objects.all() and render todos/todo_list.html with {'todos': todos}
    pass
`

const VIEWS_READ_SOLUTION = `from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import TodoForm
from .models import Todo


# GET /: every todo, newest first (Meta.ordering in models.py sorts them)
def todo_list(request):
    todos = Todo.objects.all()
    return render(request, 'todos/todo_list.html', {'todos': todos})
`

const VIEWS_HEAD = `from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import TodoForm
from .models import Todo


# GET /: every todo, newest first (Meta.ordering in models.py sorts them)
def todo_list(request):
    todos = Todo.objects.all()
    return render(request, 'todos/todo_list.html', {'todos': todos})


# GET /add/ shows an empty form; POST /add/ saves it
def todo_create(request):`

const CREATE_BODY = `    if request.method == 'POST':
        form = TodoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('todo_list')
    else:
        form = TodoForm()
    return render(request, 'todos/todo_form.html', {'form': form})`

const VIEWS_UPDATE_DELETE_STARTER = `from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from .forms import TodoForm
from .models import Todo


# GET /: every todo, newest first (Meta.ordering in models.py sorts them)
def todo_list(request):
    todos = Todo.objects.all()
    return render(request, 'todos/todo_list.html', {'todos': todos})


# GET /add/ shows an empty form; POST /add/ saves it
def todo_create(request):
    if request.method == 'POST':
        form = TodoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('todo_list')
    else:
        form = TodoForm()
    return render(request, 'todos/todo_form.html', {'form': form})


# POST /toggle/<pk>/: tick a todo off, or undo it. It changes data, so POST only.
@require_POST
def todo_toggle(request, pk):
    # TODO 1: get todo with get_object_or_404, flip completed, save, and redirect to 'todo_list'
    pass


# POST /delete/<pk>/
@require_POST
def todo_delete(request, pk):
    # TODO 2: get todo with get_object_or_404, delete it, and redirect to 'todo_list'
    pass
`

const VIEWS_TAIL = `# POST /toggle/<pk>/: tick a todo off, or undo it. It changes data, so POST only.
@require_POST
def todo_toggle(request, pk):
    todo = get_object_or_404(Todo, pk=pk)
    todo.completed = not todo.completed
    todo.save()
    return redirect('todo_list')


# POST /delete/<pk>/
@require_POST
def todo_delete(request, pk):
    todo = get_object_or_404(Todo, pk=pk)
    todo.delete()
    return redirect('todo_list')
`

const VIEWS = `${VIEWS_HEAD}\n${CREATE_BODY}\n\n\n${VIEWS_TAIL}`

const VIEWS_BUGGY = VIEWS.replace("    return render(request, 'todos/todo_list.html', {'todos': todos})", "    return render(request, 'todos/todo_list.html')")
  .replace('    todo.completed = not todo.completed\n    todo.save()\n', '    todo.completed = not todo.completed\n')
  .replace('@require_POST\ndef todo_delete(request, pk):\n    todo = get_object_or_404(Todo, pk=pk)', 'def todo_delete(request, pk):\n    todo = Todo.objects.get(pk=pk)')

const APP_URLS_STARTER = `from django.urls import path

from . import views

# Mounted at '' in config/urls.py, so '' here is the home page and 'add/' is /add/.
# name= lets templates and redirects ask for a URL by name instead of hard-coding it.
urlpatterns = [
    path('', views.todo_list, name='todo_list'),
    # TODO: 'add/'              → views.todo_create, named todo_create
    # TODO: 'toggle/<int:pk>/'  → views.todo_toggle, named todo_toggle
    # TODO: 'delete/<int:pk>/'  → views.todo_delete, named todo_delete
]
`

const APP_URLS_SOLUTION = `from django.urls import path

from . import views

# Mounted at '' in config/urls.py, so '' here is the home page and 'add/' is /add/.
# name= lets templates and redirects ask for a URL by name instead of hard-coding it.
urlpatterns = [
    path('', views.todo_list, name='todo_list'),
    path('add/', views.todo_create, name='todo_create'),
    path('toggle/<int:pk>/', views.todo_toggle, name='todo_toggle'),
    path('delete/<int:pk>/', views.todo_delete, name='todo_delete'),
]
`

// ---- templates and static files -----------------------------------------------------------
const BASE_STARTER = `<!-- TODO 1: load the static tag library, on the very first line -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Todo App{% endblock %}</title>
    <!-- TODO 2: link the stylesheet todos/css/style.css, its URL built by {% static %} -->
</head>
<body>
    <header>
        <h1><a href="{% url 'todo_list' %}">Todo App</a></h1>
    </header>

    <main>
        <!-- TODO 3: an empty block named content, for each page to fill -->
    </main>

    <script src="{% static 'todos/js/script.js' %}"></script>
</body>
</html>
`

const BASE_SOLUTION = `{% load static %}
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Todo App{% endblock %}</title>
    <link rel="stylesheet" href="{% static 'todos/css/style.css' %}">
</head>
<body>
    <header>
        <h1><a href="{% url 'todo_list' %}">Todo App</a></h1>
    </header>

    <main>
        {% block content %}
        {% endblock %}
    </main>

    <script src="{% static 'todos/js/script.js' %}"></script>
</body>
</html>
`

const TODO_FORM_HTML = `{% extends 'todos/base.html' %}

{% block title %}Add Todo{% endblock %}

{% block content %}
<h2>Add Todo</h2>

<form method="post">
    {% csrf_token %}
    {{ form.as_p }}
    <button type="submit">Add Todo</button>
</form>

<a href="{% url 'todo_list' %}">Back</a>
{% endblock %}
`

const STYLE_CSS = `body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 40px auto;
    padding: 20px;
    color: #1f2937;
}

header a {
    color: inherit;
    text-decoration: none;
}

.todo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    margin-bottom: 10px;
    border-bottom: 1px solid #e5e7eb;
}

.todo h3 {
    flex: 1;
    margin: 0;
    font-size: 1rem;
}

.todo form {
    margin: 0;
}

/* Django gives form errors this class */
.errorlist {
    color: #b91c1c;
}
`

const SCRIPT_JS = `// Django already drew the page. JavaScript only adds small touches on top.
console.log("Todo App loaded");

// Ask before deleting: every delete form carries a data-confirm message
document.querySelectorAll("form[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
});
`

const LIST_SOLUTION = `{% extends 'todos/base.html' %}

{% block title %}Todo List{% endblock %}

{% block content %}
<h2>My Todos</h2>

<a href="{% url 'todo_create' %}">Add Todo</a>

<hr>

{% for todo in todos %}
<div class="todo">
    <h3>
        {% if todo.completed %}
            <del>{{ todo.title }}</del>
        {% else %}
            {{ todo.title }}
        {% endif %}
    </h3>

    <!-- Both buttons change data, so each is a small POST form -->
    <form method="post" action="{% url 'todo_toggle' todo.id %}">
        {% csrf_token %}
        <button type="submit">{% if todo.completed %}Undo{% else %}Complete{% endif %}</button>
    </form>

    <form method="post" action="{% url 'todo_delete' todo.id %}" data-confirm="Delete this todo?">
        {% csrf_token %}
        <button type="submit">Delete</button>
    </form>
</div>
{% empty %}
<p>No todos yet.</p>
{% endfor %}
{% endblock %}
`

const LIST_BUGGY = LIST_SOLUTION.replace("{% extends 'todos/base.html' %}", "{% extends 'base.html' %}")
  .replace(`<form method="post" action="{% url 'todo_toggle' todo.id %}">\n        {% csrf_token %}\n`, `<form method="post" action="{% url 'todo_toggle' todo.id %}">\n`)
  .replace("{% url 'todo_delete' todo.id %}", "{% url 'todo_delete' %}")
  .replace('{% else %}\n            {{ todo.title }}', '{% else %}\n            {{ todo.title|safe }}')

// What curl gets back from the home page: the templates, filled in on the server.
const RENDERED_HOME = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Todo List</title>
    <link rel="stylesheet" href="/static/todos/css/style.css">
</head>
<body>
    <header>
        <h1><a href="/">Todo App</a></h1>
    </header>

    <main>
<h2>My Todos</h2>

<a href="/add/">Add Todo</a>

<hr>

<p>No todos yet.</p>
    </main>

    <script src="/static/todos/js/script.js"></script>
</body>
</html>`

const CSRF_FAILURE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="content-type" content="text/html; charset=utf-8">
  <meta name="robots" content="NONE,NOARCHIVE">
  <title>403 Forbidden</title>
  …
</head>
<body>
<div id="summary">
  <h1>Forbidden <span>(403)</span></h1>
  <p>CSRF verification failed. Request aborted.</p>
  <p>You are seeing this message because this site requires a CSRF cookie when submitting forms. This cookie is required for security reasons, to ensure that your browser is not being hijacked by third parties.</p>
  …`

// ---- tests ----------------------------------------------------------------------------------
const TESTS_SOLUTION = `from django.test import TestCase
from django.urls import reverse

from .models import Todo


# Each test runs on a fresh, empty test database, never on db.sqlite3
class TodoViewTests(TestCase):
    def test_list_shows_todos(self):
        Todo.objects.create(title='Buy milk')

        response = self.client.get(reverse('todo_list'))

        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Buy milk')

    def test_create_saves_and_redirects(self):
        response = self.client.post(reverse('todo_create'), {'title': 'Learn Django'})

        self.assertRedirects(response, reverse('todo_list'))
        self.assertEqual(Todo.objects.count(), 1)

    def test_empty_title_is_rejected(self):
        response = self.client.post(reverse('todo_create'), {'title': ''})

        # No redirect: the form comes back with its error message
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Todo.objects.count(), 0)
`

const TESTS_STARTER = TESTS_SOLUTION.replace("        self.assertContains(response, 'Buy milk')", "        # TODO 1: assert the page contains 'Buy milk' (assertContains)")
  .replace(
    "        self.assertRedirects(response, reverse('todo_list'))\n        self.assertEqual(Todo.objects.count(), 1)",
    '        # TODO 2: assert it redirects to the list (assertRedirects, with reverse)\n        # TODO 3: assert exactly one todo is now in the database',
  )
  .replace('        self.assertEqual(Todo.objects.count(), 0)', '        # TODO 4: assert nothing was saved')

const TEST_RUN = `Found 3 test(s).
Creating test database for alias 'default'...
System check identified no issues (0 silenced).
...
----------------------------------------------------------------------
Ran 3 tests in 0.019s

OK
Destroying test database for alias 'default'...`

const COVERAGE_REPORT = `Name                               Stmts   Miss  Cover
------------------------------------------------------
config/__init__.py                     0      0   100%
config/settings.py                    17      0   100%
config/urls.py                         3      0   100%
manage.py                             11      2    82%
todos/__init__.py                      0      0   100%
todos/admin.py                         1      0   100%
todos/apps.py                          4      0   100%
todos/forms.py                         6      0   100%
todos/migrations/0001_initial.py       5      0   100%
todos/migrations/__init__.py           0      0   100%
todos/models.py                        9      1    89%
todos/tests.py                        17      0   100%
todos/urls.py                          3      0   100%
todos/views.py                        24      7    71%
------------------------------------------------------
TOTAL                                100     10    90%`

const VENV = '(venv)'
const PYCACHE_ABOUT = 'Compiled Python, written the first time a module is imported. Rebuilt automatically, so git ignores it.'

// Explained in the workspace's Glossary tab; each level lists the terms its code uses.
const GLOSSARY: JourneyTerm[] = [
  // Python and the project
  { term: 'monolith', definition: 'One project that does everything: URLs, logic, data and the HTML pages. No separate frontend app.' },
  { term: 'venv', definition: 'A virtual environment: a private Python and package folder for this project, so its packages never clash with others.' },
  { term: 'activate', definition: 'Points python and pip at the venv for this terminal. The prompt shows (venv) while it is active; deactivate leaves it.', match: ['activate', 'Activate.ps1'] },
  { term: 'pip', definition: "Python's package installer. With a venv active, packages go into venv/ instead of your system Python.", match: ['pip install', 'pip freeze', 'pip3 '] },
  { term: 'requirements.txt', definition: 'Exact package versions. pip install -r requirements.txt rebuilds the same environment anywhere.' },
  { term: 'django-admin', definition: "Django's global command. startproject creates a new project skeleton." },
  { term: 'manage.py', definition: "The project's own command-line tool: runserver, startapp, makemigrations, migrate, test and more." },
  { term: 'project vs app', definition: 'The project holds site-wide settings and URLs (config/); apps are features (todos/) with their own models and views.', match: ['startproject', 'startapp'] },
  { term: 'asgi.py / wsgi.py', definition: 'Entry points for web servers. runserver goes through wsgi.py; asgi.py is only for async servers, so this project never uses it.', match: ['asgi.py', 'wsgi.py'] },
  { term: '__pycache__', definition: 'Compiled bytecode Python writes the first time it imports a module, so the next start is faster. Rebuilt automatically; .gitignore keeps it out.' },
  { term: 'settings.py', definition: 'Every setting of the site: installed apps, middleware, database, templates, time zone.' },
  { term: 'INSTALLED_APPS', definition: 'The apps Django loads. An app missing from this list gets no tables, migrations, templates or static files.' },
  { term: 'SECRET_KEY', definition: 'Signs sessions and CSRF tokens. Fine as generated for local work; production needs its own, kept outside the code.' },
  { term: 'DEBUG', definition: 'Shows detailed error pages. Useful locally, never on in production.' },
  { term: 'APP_DIRS', definition: "Template setting: when True, Django looks for templates in every installed app's templates/ folder." },
  // Data
  { term: 'models.Model', definition: 'Base class for database tables: every field you declare becomes a column.' },
  { term: 'CharField', definition: 'A text column. max_length is required.' },
  { term: 'BooleanField', definition: 'A true/false column. default=False sets the value for new rows.' },
  { term: 'DateTimeField', definition: 'A date and time column. auto_now_add sets it once when the row is created; auto_now updates it on every save.' },
  { term: 'class Meta', definition: 'Options for a model or a form: the default ordering of a model, or the model and fields of a ModelForm.' },
  { term: '__str__', definition: 'How a row prints, for example in the admin site. It must return a string.' },
  { term: 'makemigrations', definition: 'Compares your models with existing migrations and writes a new migration file describing the change.' },
  { term: 'migrate', definition: 'Applies every migration that has not run yet to the database.', match: ['manage.py migrate'] },
  { term: 'db.sqlite3', definition: "The file-based SQLite database Django uses by default. Local only; it's in .gitignore.", match: ['db.sqlite3', 'sqlite3'] },
  // Forms, views and URLs
  { term: 'ModelForm', definition: 'A form whose fields and validation come from a model. Meta.model names the model; Meta.fields lists what people may fill in.' },
  { term: 'request.method', definition: "The HTTP method of the request, always upper case: 'GET' to show a page, 'POST' to submit a form." },
  { term: 'request.POST', definition: 'The fields a submitted form sent, like title. request.GET holds the query string instead.' },
  { term: 'is_valid()', definition: 'Runs every validation rule of the form. True when the data is good; otherwise form.errors says what is wrong.', match: ['is_valid'] },
  { term: 'form.save()', definition: 'For a ModelForm: creates (or updates) the model row from the validated data.', match: ['form.save'] },
  { term: 'render()', definition: 'Fills a template with a context dict and returns the finished HTML as the response.', match: ['render('] },
  { term: 'redirect()', definition: "Answers with a 302 that sends the browser to another URL. redirect('todo_list') looks the URL up by its name.", match: ['redirect('] },
  { term: 'Post/Redirect/Get', definition: 'After a successful POST, redirect instead of rendering, so refreshing the page never submits the form twice.' },
  { term: 'get_object_or_404', definition: 'Fetches one row, or answers 404 Not Found when there is none, instead of crashing with a 500.' },
  { term: '@require_POST', definition: 'A decorator that refuses anything but POST with 405. Views that change data should never run on a GET.', match: ['require_POST'] },
  { term: 'urls.py', definition: "Maps URL paths to views. The project's root table includes each app's own table." },
  { term: 'path()', definition: 'One URL pattern: the path, the view, and a name. <int:pk> captures a number and passes it to the view as pk.', match: ['path('] },
  { term: 'include()', definition: "Hands every URL under a prefix to another urls.py, so each app keeps its own URL table.", match: ['include('] },
  { term: 'name=', definition: "A URL's name. Templates use {% url 'todo_list' %} and views use redirect('todo_list'), so paths can change without breaking links.", match: ['name='] },
  // Templates and static files
  { term: '{% extends %}', definition: "Makes a template a child of another: it only fills in the parent's blocks. It must be the first tag in the file.", match: ['{% extends'] },
  { term: '{% block %}', definition: 'A named hole in a parent template that child templates fill, like title and content.', match: ['{% block'] },
  { term: '{% static %}', definition: "{% load static %} enables the tag; {% static 'todos/css/style.css' %} turns a path into the file's URL, /static/todos/css/style.css.", match: ['{% static', '{% load static'] },
  { term: '{% url %}', definition: "Builds a URL from its name and arguments: {% url 'todo_delete' todo.id %} becomes /delete/3/.", match: ['{% url'] },
  { term: '{% csrf_token %}', definition: 'A hidden secret field in every POST form. Django refuses POSTs without it (403), so other sites cannot submit forms on your behalf.', match: ['csrf_token', 'CSRF'] },
  { term: '{% for %} / {% empty %}', definition: 'Loops over a list in a template. The {% empty %} part shows when the list has nothing in it.', match: ['{% for', '{% empty'] },
  { term: '{{ }}', definition: 'Prints a value into the HTML, escaped: <, > and quotes become harmless text.', match: ['{{ todo.title', '{{ form'] },
  { term: '|safe', definition: 'A filter that switches escaping off. Only for HTML you wrote yourself, never for anything a user typed.' },
  { term: 'static files', definition: "CSS, JavaScript and images, sent to the browser as they are. Django finds them in each app's static/ folder.", match: ['static/'] },
  // Running and testing
  { term: 'runserver', definition: 'Starts the development server at http://127.0.0.1:8000/, reloading when files change.' },
  { term: 'curl', definition: 'A command-line HTTP client. It shows exactly what the server sends back, here the finished HTML.' },
  { term: '403', definition: 'Forbidden: the server understood the request and refuses it, here because the CSRF token is missing.' },
  { term: '404', definition: 'Not Found: nothing exists at that URL or with that id.' },
  { term: 'TestCase', definition: "Django's test class. Each test runs on a fresh test database, and every change is rolled back afterwards." },
  { term: 'self.client', definition: 'A fake browser for tests: self.client.get(url) and .post(url, data) run the real URLs, views and templates.' },
  { term: 'reverse()', definition: "The Python version of {% url %}: reverse('todo_list') returns '/'.", match: ['reverse('] },
  { term: 'assertContains', definition: 'Checks the response succeeded (200) and that its HTML contains a piece of text.' },
  { term: 'assertRedirects', definition: 'Checks the response is a redirect to the given URL, and that the URL works.' },
  { term: 'coverage', definition: 'Runs your tests and records which lines they executed. coverage report lists the lines no test reached.', match: ['coverage run', 'coverage report'] },
  // Git
  { term: 'git', definition: 'git init creates a repository, git add stages files, git commit records a snapshot with a message.', match: ['git init', 'git add', 'git commit'] },
  { term: '.gitignore', definition: 'Paths git must never commit, like venv/, __pycache__/, db.sqlite3 and .env.' },
  ...GIT_TERMS,
]

export const djangoTodo: Project = {
  id: 'django-todo',
  track: 'django',
  title: 'Todo App',
  summary: 'A Django monolith: models, forms, views, templates and tests in one project, no separate frontend.',
  projectName: 'todo-django',
  folders: {
    venv: 'A private Python for this project. Rebuilt from requirements.txt, never committed.',
    config: 'The project: settings and the root URL table. One per site.',
    todos: 'An app: one feature with its own models, forms, views, templates and tests.',
    'todos/migrations': 'Database changes, generated from models.py by makemigrations.',
    'todos/templates': 'HTML templates. Django finds them because APP_DIRS is True in settings.py.',
    'todos/templates/todos': "The app's own templates. The repeated name keeps todos/base.html apart from any other app's base.html.",
    'todos/static': 'CSS and JavaScript, served as they are under /static/.',
    'todos/static/todos': "The app's own static files, namespaced like the templates.",
    'todos/static/todos/css': 'Stylesheets. base.html links style.css.',
    'todos/static/todos/js': 'Scripts: small touches on top of the HTML Django draws.',
  },
  worlds: [
    { id: 'setup', title: 'Setup Village', subtitle: 'Virtualenv, Django, a project and your first app', theme: 'village' },
    { id: 'database', title: 'Database Dungeon', subtitle: 'Models and migrations', theme: 'dungeon' },
    { id: 'views', title: 'Views Forest', subtitle: 'Forms, views and URLs: the logic of the site', theme: 'forest' },
    { id: 'templates', title: 'Template Castle', subtitle: 'HTML, CSS and JavaScript, served by Django', theme: 'castle' },
    { id: 'testing', title: 'Test Lab', subtitle: "Prove it works with Django's test runner", theme: 'lab' },
    { id: 'production', title: 'Production City', subtitle: 'Commit it, push it to GitHub, see the whole architecture', theme: 'city' },
  ],
  levels: [
    // ---- World 1: Setup Village ------------------------------------------------------------
    {
      id: 'big-picture',
      world: 'setup',
      kind: 'explore',
      title: 'Projects and apps',
      summary: 'How a Django monolith is organised: one project, many apps, no separate frontend.',
      lesson: `Django organises code in two layers:
- the project holds site-wide settings and the root URL table. You create it once.
- apps are features: todos, accounts, payments. Each has its own models, views, templates and tests, and the project lists the apps it uses.

This journey builds a monolith: one Django project does everything, with no React and no separate frontend. A request travels browser → URL → view → model → database, and comes back as HTML that a template filled in:
- templates are the HTML
- views are the logic
- models are the data

You will type the same commands a Django developer types on day one and watch each one generate its files. Some generated files are never used by this project; the explorer shows them with a lock. Start with the two files every repository needs.`,
      adds: [
        { path: 'README.md', about: 'The map of the project: folders, where each file comes from, how to run it.', content: README },
        { path: '.gitignore', about: 'venv/, caches, the local database and secrets stay out of git.', content: GITIGNORE },
      ],
      quiz: {
        question: 'In this Django monolith, who builds the HTML the browser shows?',
        options: ['A separate React app', 'Django, by filling templates on the server', 'The database'],
        answer: 1,
        explain: 'A view fetches the data and renders a template with it, so the browser receives finished HTML. Each feature lives in its own app, and the project lists the apps in INSTALLED_APPS.',
      },
    },
    {
      id: 'virtualenv',
      world: 'setup',
      kind: 'command',
      title: 'Create a virtual environment',
      summary: 'Give the project its own Python, so its packages never clash with others.',
      lesson: `Installing packages globally means every project on your machine shares one version of Django. A virtual environment is a private copy of Python inside your project folder: whatever you install there stays there.

You create it once with \`python -m venv venv\` (the second venv is the folder name), then activate it in every new terminal.`,
      cwd: '',
      steps: [
        {
          goal: 'Create a virtual environment in a folder called venv.',
          hint: 'Run the venv module with python -m, followed by the folder name.',
          accept: ['python -m venv venv', 'python3 -m venv venv', 'py -m venv venv'],
          adds: [
            { path: 'venv/', about: 'A private Python for this project. Never committed: rebuild it from requirements.txt.', generated: true },
            { path: 'venv/pyvenv.cfg', about: 'Records which Python this environment was made from.', content: 'home = /usr/local/bin\ninclude-system-site-packages = false\nversion = 3.12.6\n', generated: true },
          ],
          explain: 'venv/ holds its own python and pip. It is in .gitignore, so it never reaches GitHub.',
        },
        {
          goal: 'Activate the virtual environment.',
          hint: 'macOS / Linux: source venv/bin/activate. Windows: venv\\Scripts\\activate',
          accept: ['source venv/bin/activate', '. venv/bin/activate', 'venv\\Scripts\\activate', '.\\venv\\Scripts\\activate', 'venv/Scripts/activate', 'source venv/Scripts/activate', '.\\venv\\Scripts\\Activate.ps1', 'venv\\Scripts\\Activate.ps1'],
          env: VENV,
          explain: 'The prompt now starts with (venv): python and pip point inside venv/ until you run deactivate.',
        },
      ],
    },
    {
      id: 'install-django',
      world: 'setup',
      kind: 'command',
      title: 'Install Django',
      summary: 'Install Django into the venv and record it in requirements.txt.',
      lesson: `With the environment active, pip installs into venv/ instead of your system Python.

Afterwards, \`pip freeze\` prints every installed package with its exact version. Redirecting that into requirements.txt (the \`>\` sends output to a file) lets anyone recreate your environment with \`pip install -r requirements.txt\`.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Install Django.',
          hint: 'pip install and the package name.',
          accept: ['pip install django', 'pip install Django', 'python -m pip install django', 'pip3 install django'],
          output: 'Collecting django\n  Downloading django-5.2.7-py3-none-any.whl (8.3 MB)\nCollecting asgiref>=3.8.1 (from django)\n  Downloading asgiref-3.10.0-py3-none-any.whl (24 kB)\nCollecting sqlparse>=0.3.1 (from django)\n  Downloading sqlparse-0.5.3-py3-none-any.whl (44 kB)\nInstalling collected packages: sqlparse, asgiref, django\nSuccessfully installed asgiref-3.10.0 django-5.2.7 sqlparse-0.5.3',
          explain: 'Django arrived with two dependencies of its own. All three live inside venv/.',
        },
        {
          goal: 'Save the installed packages to requirements.txt.',
          hint: 'pip freeze prints them; > sends that output into a file.',
          accept: ['pip freeze > requirements.txt', 'python -m pip freeze > requirements.txt', 'pip3 freeze > requirements.txt'],
          adds: [{ path: 'requirements.txt', about: 'Exact package versions. pip install -r requirements.txt recreates the environment.', content: 'asgiref==3.10.0\nDjango==5.2.7\nsqlparse==0.5.3\n' }],
          explain: 'Commit requirements.txt, not venv/.',
        },
      ],
    },
    {
      id: 'start-project',
      world: 'setup',
      kind: 'command',
      title: 'Start the project',
      summary: 'Generate the project: settings, URLs and manage.py.',
      lesson: `\`django-admin startproject\` writes the skeleton of a site. Naming the project \`config\` makes its job obvious: it holds configuration, not features.

The final dot matters. \`django-admin startproject config .\` puts manage.py right here, in the project root. Without it you get an extra nested folder (config/config/) that confuses everyone.

One of the new files, asgi.py, is for async servers this project never uses. The explorer shows it locked.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Create a project called config in the current folder.',
          hint: 'django-admin startproject <name> <directory>. The current directory is a dot.',
          accept: ['django-admin startproject config .', 'python -m django startproject config .'],
          adds: [
            { path: 'manage.py', about: "Django's command-line tool: runserver, migrate, startapp, …", content: MANAGE_PY },
            { path: 'config/__init__.py', about: 'Marks config/ as a Python package. Empty on purpose.', content: '' },
            { path: 'config/settings.py', about: 'Every setting of the site: installed apps, database, templates, middleware.', content: SETTINGS },
            { path: 'config/urls.py', about: 'The root URL table. Apps plug their own URLs in here.', content: URLS },
            { path: 'config/wsgi.py', about: 'Entry point for classic servers like Gunicorn. runserver goes through it too.', content: serverEntry('wsgi') },
            { path: 'config/asgi.py', about: 'Entry point for async servers like Uvicorn. This project runs on WSGI, so it never uses it.', content: serverEntry('asgi'), unused: true },
          ],
          explain: 'Open config/settings.py: INSTALLED_APPS lists the apps this site uses, and DATABASES points at a local SQLite file.',
        },
      ],
    },
    {
      id: 'start-app',
      world: 'setup',
      kind: 'command',
      title: 'Create the todos app',
      summary: 'Generate an app for the todos feature.',
      lesson: `Features live in apps. \`python manage.py startapp todos\` creates a todos/ folder with a file for each job: models for data, views for request handlers, tests, and a migrations/ package for database changes.

It also writes admin.py, for Django's admin site. This project doesn't use the admin, so the explorer shows it locked.

Notice what is missing: no forms.py, no urls.py, no templates. startapp gives you a skeleton; you will create those yourself later.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Create an app called todos.',
          hint: 'Use manage.py: python manage.py startapp <name>',
          accept: ['python manage.py startapp todos', 'python3 manage.py startapp todos', 'py manage.py startapp todos', 'django-admin startapp todos'],
          adds: [
            { path: 'todos/__init__.py', about: 'Marks todos/ as a Python package.', content: '' },
            { path: 'todos/apps.py', about: "The app's configuration class.", content: APPS_PY },
            { path: 'todos/migrations/__init__.py', about: 'Makes migrations/ a package, so Django can find the migrations.', content: '' },
            { path: 'todos/models.py', about: 'Database tables, as Python classes.', content: 'from django.db import models\n\n# Create your models here.\n' },
            { path: 'todos/tests.py', about: 'Tests for this app.', content: 'from django.test import TestCase\n\n# Create your tests here.\n' },
            { path: 'todos/views.py', about: 'Functions that handle requests.', content: 'from django.shortcuts import render\n\n# Create your views here.\n' },
            { path: 'todos/admin.py', about: 'Registers models with the admin site. This project does not use the admin, so it stays empty.', content: 'from django.contrib import admin\n\n# Register your models here.\n', unused: true },
            { path: 'config/__pycache__/', about: PYCACHE_ABOUT, generated: true },
          ],
          explain: 'manage.py loaded config/settings.py to run, so Python cached it in config/__pycache__/. Django does not know about the app yet: that is the next level.',
        },
      ],
    },
    {
      id: 'register-app',
      world: 'setup',
      kind: 'edit',
      boss: true,
      title: 'Register the app',
      summary: 'Add todos to INSTALLED_APPS so Django loads it.',
      lesson: `Creating an app folder is not enough: Django only loads the apps listed in \`INSTALLED_APPS\` in settings.py. An unlisted app's models get no tables, its migrations never run, and its templates and static files are never found.

Add \`'todos'\` to the end of the list. (The longer form \`'todos.apps.TodosConfig'\` works too.)`,
      path: 'config/settings.py',
      about: 'Every setting of the site: installed apps, database, templates, middleware.',
      starter: SETTINGS.replace("    'django.contrib.staticfiles',\n]", "    'django.contrib.staticfiles',\n    # TODO: add the todos app, so Django loads it\n]"),
      solution: SETTINGS_WITH_APP,
      checks: [
        {
          id: 'installed',
          name: 'todos is in INSTALLED_APPS',
          hint: "Add 'todos', as a new line just before the closing ] of INSTALLED_APPS.",
          type: 'matches',
          value: /INSTALLED_APPS\s*=\s*\[[^\]]*["'](?:todos|todos\.apps\.TodosConfig)["']/.source,
        },
        { id: 'builtins', name: "Django's built-in apps are still installed", hint: 'Only add a line: the admin, auth and other built-in apps must stay.', type: 'includes', value: "'django.contrib.admin'," },
      ],
      gaps: [
        {
          marker: 'TODO: add the todos app',
          goal: 'Add the todos app to the end of INSTALLED_APPS.',
          options: [
            { code: 'todos,', why: "Without quotes, Python looks for a variable named todos, and settings.py stops with NameError: name 'todos' is not defined." },
            { code: "'todos/',", why: "INSTALLED_APPS takes Python module names, not folder paths. Django stops with ModuleNotFoundError: No module named 'todos/'." },
            { code: "'todos',", why: "The app's name, as text, like every other entry in the list. Django finds todos/apps.py and loads the app." },
          ],
          answer: 2,
          checks: ['installed'],
          sources: [
            { name: 'todos', from: 'file', path: 'todos/apps.py', find: "name = 'todos'", note: 'The app you made with startapp. Its apps.py names it todos.' },
            { name: 'INSTALLED_APPS', from: 'here', find: 'INSTALLED_APPS = [', note: "Django's list of apps to load, written by startproject. Only add a line." },
          ],
          result: 'Django now loads the app: makemigrations finds its models, and later Django finds its templates and static files.',
        },
      ],
    },

    // ---- World 2: Database Dungeon ---------------------------------------------------------
    {
      id: 'model-bug-hunt',
      world: 'database',
      kind: 'bugfix',
      boss: true,
      title: 'Bug hunt: the Todo model',
      summary: 'Two bugs stop Django from starting, two hide until later.',
      lesson: `A model is a Python class that Django turns into a database table: each field becomes a column.

This model has four bugs. Two make every manage.py command fail with an error; two slip through and bite later, in the admin site and in your data. Fix them all.`,
      path: 'todos/models.py',
      about: 'Database tables, as Python classes.',
      starter: MODEL_BUGGY,
      solution: MODEL_SOLUTION,
      checks: [
        { id: 'base-class', name: 'Todo inherits from models.Model', hint: '"AttributeError: module \'django.db.models\' has no attribute \'model\'". The base class is Model, capitalised.', type: 'includes', value: 'class Todo(models.Model)' },
        { id: 'max-length', name: 'title has a max_length', hint: 'Django refuses to start: "(fields.E120) CharFields must define a \'max_length\' attribute". Use models.CharField(max_length=200).', type: 'matches', value: /title\s*=\s*models\.CharField\(\s*max_length\s*=\s*\d+/.source },
        { id: 'created-once', name: 'created_at is set once, on creation', hint: 'auto_now updates the field on every save, so "created at" would change whenever a todo is ticked off. You want auto_now_add.', type: 'includes', value: 'DateTimeField(auto_now_add=True)' },
        { id: 'str', name: '__str__ returns the title', hint: '__str__ must return a string. print() returns None, so the admin site crashes with "__str__ returned non-string".', type: 'matches', value: /def\s+__str__\(self\)\s*(?:->\s*str\s*)?:\s*\n\s*return\s+self\.title\b/.source },
      ],
    },
    {
      id: 'migrate',
      world: 'database',
      kind: 'command',
      title: 'Migrate the database',
      summary: 'Turn the model into a table.',
      lesson: `Models describe tables; migrations create them. It is a two-step dance:
- \`makemigrations\` compares your models with the existing migrations and writes a new migration file describing the change.
- \`migrate\` applies every migration that has not run yet to the database.

Migration files are code: commit them, so every copy of the project builds the same tables. The database itself, db.sqlite3, stays on your machine.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Generate a migration for the todos app.',
          hint: 'python manage.py makemigrations',
          accept: ['python manage.py makemigrations', 'python manage.py makemigrations todos', 'python3 manage.py makemigrations', 'py manage.py makemigrations'],
          output: "Migrations for 'todos':\n  todos/migrations/0001_initial.py\n    + Create model Todo",
          adds: [
            { path: 'todos/migrations/0001_initial.py', about: 'Creates the todos_todo table. Generated from models.py.', content: MIGRATION },
            { path: 'todos/__pycache__/', about: PYCACHE_ABOUT, generated: true },
            { path: 'todos/migrations/__pycache__/', about: PYCACHE_ABOUT, generated: true },
          ],
          explain: 'Open the new migration: it lists every column of your model, plus the id Django adds for you.',
        },
        {
          goal: 'Apply all migrations to the database.',
          hint: 'python manage.py migrate',
          accept: ['python manage.py migrate', 'python3 manage.py migrate', 'py manage.py migrate'],
          output:
            'Operations to perform:\n  Apply all migrations: admin, auth, contenttypes, sessions, todos\nRunning migrations:\n  Applying contenttypes.0001_initial... OK\n  Applying auth.0001_initial... OK\n  Applying admin.0001_initial... OK\n  Applying sessions.0001_initial... OK\n  Applying todos.0001_initial... OK',
          adds: [{ path: 'db.sqlite3', about: 'The local SQLite database. Ignored by git.', generated: true }],
          explain: 'db.sqlite3 appeared: your table, plus the ones built-in apps like auth and sessions need.',
        },
      ],
    },

    // ---- World 3: Views Forest -------------------------------------------------------------
    {
      id: 'manual-files',
      world: 'views',
      kind: 'command',
      title: "Create the files Django doesn't",
      summary: 'Make todos/forms.py and todos/urls.py yourself.',
      lesson: `startproject and startapp give you a skeleton, not a finished app. Two files every Django app needs are yours to create:
- todos/forms.py turns what people type into a valid Todo
- todos/urls.py maps the app's paths to its views

Both start as empty files. On macOS or Linux, \`touch\` creates one; in Windows PowerShell it is \`New-Item\`.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Create an empty file todos/forms.py.',
          hint: 'macOS / Linux: touch <path>. Windows PowerShell: New-Item <path>',
          accept: ['touch todos/forms.py', 'New-Item todos/forms.py', 'New-Item todos\\forms.py', 'ni todos/forms.py', 'ni todos\\forms.py', 'New-Item -ItemType File todos/forms.py', 'New-Item -Path todos/forms.py -ItemType File', 'type nul > todos\\forms.py'],
          adds: [{ path: 'todos/forms.py', about: 'Forms: turns posted data into a validated Todo. Empty for now.', content: '' }],
          explain: 'An empty forms.py appears in todos/. You fill it in the next level.',
        },
        {
          goal: 'Create an empty file todos/urls.py.',
          hint: 'The same command, with the other file name.',
          accept: ['touch todos/urls.py', 'New-Item todos/urls.py', 'New-Item todos\\urls.py', 'ni todos/urls.py', 'ni todos\\urls.py', 'New-Item -ItemType File todos/urls.py', 'New-Item -Path todos/urls.py -ItemType File', 'type nul > todos\\urls.py'],
          adds: [{ path: 'todos/urls.py', about: "The app's URL table: maps paths like add/ to views. Empty for now.", content: '' }],
          explain: "Not to be confused with config/urls.py: that is the project's table, and it will include this one.",
        },
      ],
    },
    {
      id: 'todo-form',
      world: 'views',
      kind: 'edit',
      title: 'Write the form',
      summary: 'A ModelForm that turns a posted title into a valid Todo.',
      lesson: `A Django form does two jobs: it draws the HTML input, and it checks what comes back before anything touches the database.

A \`ModelForm\` builds both from a model. Its inner \`class Meta\` names the model and lists the fields people may fill in. Here that is only the title: completed starts as False, and Django sets created_at.

List the fields one by one. \`fields = '__all__'\` would let anyone who edits the HTML set fields you never meant to show.`,
      path: 'todos/forms.py',
      about: 'Forms: turns posted data into a validated Todo.',
      starter: FORM_STARTER,
      solution: FORM_SOLUTION,
      checks: [
        { id: 'import', name: 'Imports the Todo model', hint: 'from .models import Todo (the dot means "this app").', type: 'matches', value: /from\s+(?:\.|todos\.)models\s+import\s+(?:[\w\s,]*\b)?Todo\b/.source },
        { id: 'model', name: 'The form saves Todo rows', hint: 'Inside class Meta: model = Todo', type: 'matches', value: /class\s+Meta\s*:[\s\S]*?\bmodel\s*=\s*Todo\b/.source },
        { id: 'fields', name: 'Only the title can be filled in', hint: "fields = ['title']. Never '__all__': list each field on purpose.", type: 'matches', value: /\bfields\s*=\s*[[(]\s*["']title["']\s*,?\s*[\])]/.source },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Import the Todo model from models.py, in this same app.',
          options: [
            { code: 'from models import Todo', why: 'Without the dot, Python looks for a top-level module called models, finds none, and stops with ModuleNotFoundError.' },
            { code: 'from .models import Todo', why: 'The dot means "this app": todos/models.py. Todo is now a name you can use in this file.' },
            { code: 'import Todo', why: 'Todo is a class inside models.py, not a module of its own. Python needs the file it lives in.' },
          ],
          answer: 1,
          checks: ['import'],
          sources: [
            { name: 'Todo', from: 'file', path: 'todos/models.py', find: 'class Todo(models.Model)', note: 'The model you fixed in the Database Dungeon.' },
            { name: 'forms', from: 'import', find: 'from django import forms', note: "Django's forms package, imported on line 1. ModelForm comes from it." },
          ],
          result: 'Todo becomes a name in this file, so class Meta can point at it.',
        },
        {
          marker: 'TODO 2:',
          goal: 'Tell the form which model it saves.',
          options: [
            { code: "model = 'Todo'", why: "That is the text 'Todo', not the class. Django needs the class itself and fails: 'str' object has no attribute '_meta'." },
            { code: 'models = Todo', why: 'The option is model, singular. Django ignores the unknown name and refuses: ModelForm has no model class specified.' },
            { code: 'model = Todo', why: 'The class you imported. Django reads its fields, and their rules, from here.' },
          ],
          answer: 2,
          checks: ['model'],
          sources: [
            { name: 'Todo', from: 'import', find: 'from .models import Todo', note: 'Imported in gap 1, from todos/models.py.' },
            { name: 'class Meta', from: 'here', find: 'class Meta:', note: 'Options for the form. A ModelForm reads model and fields from here.' },
          ],
          result: 'TodoForm(request.POST).save() will create a Todo row.',
        },
        {
          marker: 'TODO 3:',
          span: 2,
          goal: 'List the fields people may fill in: only title.',
          options: [
            { code: "fields = ['title']", why: 'A list with one field: the form draws one input, named title, and accepts nothing else.' },
            { code: "fields = 'title'", why: "A plain string is not a list. Django refuses: TodoForm.Meta.fields cannot be a string. Did you mean to type: ('title',)?" },
            { code: "fields = '__all__'", why: 'Every field becomes editable, completed included, so anyone who edits the HTML can post completed=True. List fields on purpose.' },
          ],
          answer: 0,
          checks: ['fields'],
          sources: [{ name: 'title', from: 'file', path: 'todos/models.py', find: 'title = models.CharField', note: 'The column in models.py. The form takes its max_length=200 rule from here.' }],
          result: 'todo_create can now trust form.is_valid(): only a valid title gets through.',
        },
      ],
    },
    {
      id: 'views-read',
      world: 'views',
      kind: 'edit',
      title: 'Import models and write todo_list',
      summary: 'Import shortcuts, forms, and models, and query all todos for the list view.',
      lesson: `A Django view is a Python function that takes an \`HttpRequest\` and returns an \`HttpResponse\`.

Start \`todos/views.py\` from scratch:
- Import shortcuts from \`django.shortcuts\`: \`render\` to draw templates, \`redirect\` to send the browser to another URL, and \`get_object_or_404\` to safely look up model instances.
- Import \`require_POST\` from \`django.views.decorators.http\` for actions that change data.
- Import \`TodoForm\` from \`.forms\` and \`Todo\` from \`.models\`.
- Write \`todo_list(request)\`: query all todos with \`Todo.objects.all()\` and render \`todos/todo_list.html\` with \`{'todos': todos}\`.`,
      path: 'todos/views.py',
      about: 'The logic: list, create, toggle and delete todos.',
      starter: VIEWS_READ_STARTER,
      solution: VIEWS_READ_SOLUTION,
      checks: [
        { id: 'shortcuts', name: 'Imports shortcuts and require_POST', hint: 'from django.shortcuts import get_object_or_404, redirect, render and from django.views.decorators.http import require_POST', type: 'includes', value: 'from django.shortcuts import get_object_or_404, redirect, render\nfrom django.views.decorators.http import require_POST' },
        { id: 'imports', name: 'Imports TodoForm and Todo', hint: 'from .forms import TodoForm and from .models import Todo', type: 'includes', value: 'from .forms import TodoForm\nfrom .models import Todo' },
        { id: 'list-view', name: 'todo_list queries todos and renders todo_list.html', hint: "todos = Todo.objects.all()\n    return render(request, 'todos/todo_list.html', {'todos': todos})", type: 'includes', value: "todos = Todo.objects.all()\n    return render(request, 'todos/todo_list.html', {'todos': todos})" },
      ],
      gaps: [
        {
          marker: '# TODO 1:',
          goal: 'Import shortcuts and require_POST.',
          options: [
            { code: 'from django.shortcuts import get_object_or_404, redirect, render\nfrom django.views.decorators.http import require_POST', why: 'Imports the shortcuts for rendering templates, redirecting, and fetching models, along with the POST-only decorator.' },
            { code: 'from django.shortcuts import render\nfrom django.views.decorators.http import require_POST', why: 'Missing redirect and get_object_or_404, which views need to send users to the list and safely look up rows.' },
            { code: 'from django.http import get_object_or_404, redirect, render', why: 'These helpers live in django.shortcuts, not django.http. Python would fail with ImportError.' },
          ],
          answer: 0,
          checks: ['shortcuts'],
          sources: [
            { name: 'render', from: 'builtin', note: 'Django shortcut that renders a template with a context dictionary.' },
            { name: 'redirect', from: 'builtin', note: 'Sends an HTTP 302 redirect response.' },
          ],
          result: 'Shortcuts and decorators are available to the view functions.',
        },
        {
          marker: '# TODO 2:',
          goal: 'Import TodoForm and Todo from this app.',
          options: [
            { code: 'from forms import TodoForm\nfrom models import Todo', why: 'Missing the dot prefix: Python will search top-level site packages instead of the current todos app.' },
            { code: 'from .forms import TodoForm\nfrom .models import Todo', why: 'Relative imports: loads TodoForm from todos/forms.py and Todo from todos/models.py.' },
            { code: 'import TodoForm, Todo', why: 'TodoForm and Todo are classes inside files, not top-level modules.' },
          ],
          answer: 1,
          checks: ['imports'],
          sources: [
            { name: 'TodoForm', from: 'file', path: 'todos/forms.py', find: 'class TodoForm(forms.ModelForm)', note: 'The ModelForm created in the previous level.' },
            { name: 'Todo', from: 'file', path: 'todos/models.py', find: 'class Todo(models.Model)', note: 'The Todo database model.' },
          ],
          result: 'Todo and TodoForm can now be used in your view functions.',
        },
        {
          marker: '# TODO 3:',
          goal: 'Query all todos and render the todo_list.html template.',
          options: [
            { code: "todos = Todo.objects.all()\n    return render(request, 'todos/todo_list.html', {'todos': todos})", why: 'Queries all rows (ordered by -created_at from models.py Meta) and renders the list template.' },
            { code: "todos = Todo.objects.all()\n    return render(request, 'todos/todo_list.html')", why: 'Missing context dictionary: the template will receive no todos variable and draw an empty list.' },
            { code: "todos = Todo.all()\n    return render(request, 'todos/todo_list.html', {'todos': todos})", why: 'Django models use an objects manager: Todo.objects.all(), not Todo.all().' },
          ],
          answer: 0,
          checks: ['list-view'],
          sources: [
            { name: 'Todo', from: 'file', path: 'todos/models.py', find: 'class Todo(models.Model)', note: 'The model whose rows are queried with Todo.objects.all().' },
            { name: 'request', from: 'param', find: 'def todo_list(request)', note: 'HttpRequest passed by Django to every view.' },
          ],
          result: 'todo_list renders the home page with all existing todos.',
        },
      ],
    },
    {
      id: 'create-view',
      world: 'views',
      kind: 'build',
      title: 'Build todo_create',
      summary: 'Arrange the view behind /add/: show the form, check it, save it, redirect.',
      lesson: `Now add the Create operation: todo_create answers the same URL, /add/, in two ways:
- GET, the first visit: draw an empty form.
- POST, the form was submitted: fill the form with \`request.POST\`, check it with \`is_valid()\`, save it, and redirect to the list.

When the data is invalid, the view falls through to the same render, and the form comes back with its error messages.

Redirecting after a successful POST is called Post/Redirect/Get: refreshing the list never submits the form a second time. Some blocks look right but hide a bug: hover one to read what it does.`,
      path: 'todos/views.py',
      about: 'The logic: list, create, toggle and delete todos.',
      scaffold: [...lines(VIEWS_HEAD), slot(1, 4), slot(2, 8), slot(3, 4), slot(4, 4)],
      blocks: [
        { id: 'bind', label: 'Fill the form with what was sent', code: "if request.method == 'POST':\n    form = TodoForm(request.POST)", what: 'On a submit, binds the posted fields (here, title) to a TodoForm so it can check them.', whyHere: 'Everything after this depends on whether this is a submit or a first visit.' },
        { id: 'save', label: 'Save valid data, then go to the list', code: "if form.is_valid():\n    form.save()\n    return redirect('todo_list')", what: "is_valid() runs the model's rules (required, at most 200 characters). Only then does save() insert the row, and redirect sends the browser to the list.", whyHere: 'Inside the POST branch: there is only something to save when the form was submitted.' },
        { id: 'empty', label: 'Start with an empty form', code: 'else:\n    form = TodoForm()', what: 'On a GET, an unbound form: an empty title box and no errors.', whyHere: 'The other side of the POST check.' },
        { id: 'render', label: 'Draw the form page', code: "return render(request, 'todos/todo_form.html', {'form': form})", what: 'Renders the template with the form: empty after a GET, with error messages after an invalid POST.', whyHere: 'Last, outside both branches, so every path that did not redirect ends here.' },
        { id: 'bad-bind', label: 'Fill the form with what was sent', code: "if request.method == 'POST':\n    form = TodoForm(request.GET)", what: 'Binds the request data.', whyWrong: 'A POST form sends its fields in the body, in request.POST. request.GET is the query string, so the form would always be empty and invalid.' },
        { id: 'bad-save', label: 'Save valid data, then go to the list', code: "if form.is_valid:\n    form.save()\n    return redirect('todo_list')", what: 'Saves the todo when it is valid.', whyWrong: 'is_valid without () is the method itself, which is always truthy. Invalid data reaches save(), which raises ValueError.' },
        { id: 'bad-render-list', label: 'Save and show the list', code: "if form.is_valid():\n    form.save()\n    return render(request, 'todos/todo_list.html', {'todos': Todo.objects.all()})", what: 'Saves the todo and shows the list straight away.', whyWrong: 'The browser stays on the POST. Refreshing the page sends the form again and saves a duplicate todo. Redirect instead (Post/Redirect/Get).' },
        { id: 'bad-render', label: 'Draw the form page', code: "return render(request, 'todos/todo_form.html')", what: 'Renders the form template.', whyWrong: 'No context: the template has no form to draw, so the page shows a button without an input, and the errors of an invalid POST are lost.' },
      ],
      steps: [
        { kind: 'Request method', goal: 'On a submit, fill a TodoForm with the posted data.' },
        { kind: 'Validation', goal: 'Save only valid data, then send the browser to the list.' },
        { kind: 'First visit', goal: 'On a plain GET, start with an empty form.' },
        { kind: 'Response', goal: 'Draw the form page, empty or with its errors.' },
      ],
    },
    {
      id: 'views-update-delete',
      world: 'views',
      kind: 'edit',
      title: 'Build todo_toggle and todo_delete',
      summary: 'Protect state-changing views with @require_POST and update or delete rows safely.',
      lesson: `Complete the view suite with update (toggle) and delete:

- Both views change database data, so they are decorated with \`@require_POST\`. If a user or web crawler tries to call them with GET, Django immediately returns 405 Method Not Allowed.
- \`get_object_or_404(Todo, pk=pk)\` looks up the row by primary key. If it doesn't exist, Django immediately raises an \`Http404\` error page instead of crashing with \`DoesNotExist\`.
- \`todo_toggle\` flips \`completed\` (\`todo.completed = not todo.completed\`), calls \`todo.save()\`, and redirects to \`todo_list\`.
- \`todo_delete\` calls \`todo.delete()\` and redirects to \`todo_list\`.`,
      path: 'todos/views.py',
      about: 'The logic: list, create, toggle and delete todos.',
      starter: VIEWS_UPDATE_DELETE_STARTER,
      solution: VIEWS,
      checks: [
        { id: 'toggle', name: 'todo_toggle flips completed, saves, and redirects', hint: "todo = get_object_or_404(Todo, pk=pk)\n    todo.completed = not todo.completed\n    todo.save()\n    return redirect('todo_list')", type: 'includes', value: "todo = get_object_or_404(Todo, pk=pk)\n    todo.completed = not todo.completed\n    todo.save()\n    return redirect('todo_list')" },
        { id: 'delete', name: 'todo_delete deletes the todo and redirects', hint: "todo = get_object_or_404(Todo, pk=pk)\n    todo.delete()\n    return redirect('todo_list')", type: 'includes', value: "todo = get_object_or_404(Todo, pk=pk)\n    todo.delete()\n    return redirect('todo_list')" },
      ],
      gaps: [
        {
          marker: '# TODO 1:',
          goal: 'Find the todo by pk, toggle completed, save, and redirect.',
          options: [
            { code: "todo = get_object_or_404(Todo, pk=pk)\n    todo.completed = not todo.completed\n    todo.save()\n    return redirect('todo_list')", why: 'Looks up the todo or raises 404, inverts completed boolean, saves changes to database, and redirects to list.' },
            { code: "todo = Todo.objects.get(pk=pk)\n    todo.completed = not todo.completed\n    todo.save()\n    return redirect('todo_list')", why: 'Todo.objects.get raises DoesNotExist which crashes with a 500 error instead of a clean 404.' },
            { code: "todo = get_object_or_404(Todo, pk=pk)\n    todo.completed = not todo.completed\n    return redirect('todo_list')", why: 'Missing todo.save(): the change only happened in Python memory and never reached the database.' },
          ],
          answer: 0,
          checks: ['toggle'],
          sources: [
            { name: 'get_object_or_404', from: 'import', find: 'from django.shortcuts import get_object_or_404', note: 'Shortcut imported at the top.' },
            { name: 'Todo', from: 'file', path: 'todos/models.py', find: 'class Todo(models.Model)', note: 'The model.' },
          ],
          result: 'Toggling flips completion status and redirects back to the list.',
        },
        {
          marker: '# TODO 2:',
          goal: 'Find the todo by pk, delete it, and redirect.',
          options: [
            { code: "todo = get_object_or_404(Todo, pk=pk)\n    todo.delete()\n    return redirect('todo_list')", why: 'Finds row safely with 404 protection, runs DELETE query, and redirects back to the list.' },
            { code: "todo = get_object_or_404(Todo, pk=pk)\n    return redirect('todo_list')", why: 'Missing todo.delete(): the row is never removed from the database.' },
            { code: "Todo.delete(pk=pk)\n    return redirect('todo_list')", why: 'Todo has no class-level delete(pk=...) method. You must delete an instance or queryset.' },
          ],
          answer: 0,
          checks: ['delete'],
          sources: [
            { name: 'get_object_or_404', from: 'import', find: 'from django.shortcuts import get_object_or_404', note: 'Shortcut imported at the top.' },
            { name: 'Todo', from: 'file', path: 'todos/models.py', find: 'class Todo(models.Model)', note: 'The model.' },
          ],
          result: 'Deletes the specified todo row from SQLite.',
        },
      ],
    },
    {
      id: 'app-urls',
      world: 'views',
      kind: 'edit',
      title: "Wire the app's URLs",
      summary: 'Map each path of the todos app to its view, with a name.',
      lesson: `urls.py maps a path to a view. Each \`path()\` takes the path, the view, and a \`name\`.

The name matters: templates ask for \`{% url 'todo_list' %}\` and views for \`redirect('todo_list')\`, so a path can change later without breaking a single link.

\`<int:pk>\` captures a number from the path and passes it to the view as \`pk\`: /delete/3/ calls \`todo_delete(request, pk=3)\`. The home page is done; add the other three.`,
      path: 'todos/urls.py',
      about: "The app's URL table: maps paths like add/ to views.",
      starter: APP_URLS_STARTER,
      solution: APP_URLS_SOLUTION,
      checks: [
        { id: 'add', name: '/add/ goes to todo_create', hint: "Follow the first line: path('add/', views.todo_create, name='todo_create'),", type: 'includes', value: "path('add/', views.todo_create, name='todo_create')" },
        { id: 'toggle', name: '/toggle/<pk>/ goes to todo_toggle', hint: "The id is part of the path: path('toggle/<int:pk>/', views.todo_toggle, name='todo_toggle'),", type: 'includes', value: "path('toggle/<int:pk>/', views.todo_toggle, name='todo_toggle')" },
        { id: 'delete', name: '/delete/<pk>/ goes to todo_delete', hint: "path('delete/<int:pk>/', views.todo_delete, name='todo_delete'),", type: 'includes', value: "path('delete/<int:pk>/', views.todo_delete, name='todo_delete')" },
      ],
      gaps: [
        {
          marker: "TODO: 'add/'",
          goal: '/add/ goes to views.todo_create, named todo_create.',
          options: [
            { code: "path('add/', views.todo_create(), name='todo_create'),", why: 'The parentheses call the view now, while the URLs load, with no request. Pass the function: views.todo_create.' },
            { code: "path('add/', views.todo_create, name='todo_create'),", why: 'The path, the view function itself, and a name for templates to link to.' },
            { code: "path('/add/', views.todo_create, name='todo_create'),", why: "Django paths never start with a slash: this one would only match //add/, and Django warns about it." },
          ],
          answer: 1,
          checks: ['add'],
          sources: [
            { name: 'path', from: 'import', find: 'from django.urls import path', note: "Django's function for one URL pattern, imported on line 1." },
            { name: 'views', from: 'import', find: 'from . import views', note: "This app's views.py, imported as a module: views.todo_create is a function inside it." },
            { name: 'todo_create', from: 'file', path: 'todos/views.py', find: 'def todo_create(request)', note: 'The view you built in Build todo_create.' },
          ],
          result: "Templates link to it with {% url 'todo_create' %}, and Django writes /add/.",
        },
        {
          marker: "TODO: 'toggle",
          goal: '/toggle/<id>/ goes to views.todo_toggle, named todo_toggle.',
          options: [
            { code: "path('toggle/<pk>/', views.todo_toggle, name='todo_toggle'),", why: 'Without int:, any text matches, so /toggle/abc/ reaches the view and crashes with a 500 instead of answering 404.' },
            { code: "path('toggle/<int:id>/', views.todo_toggle, name='todo_toggle'),", why: "Django passes the captured value by its name. The view is todo_toggle(request, pk), so a capture named id fails: unexpected keyword argument 'id'." },
            { code: "path('toggle/<int:pk>/', views.todo_toggle, name='todo_toggle'),", why: '<int:pk> captures a number and hands it to the view as pk: /toggle/3/ calls todo_toggle(request, pk=3).' },
          ],
          answer: 2,
          checks: ['toggle'],
          sources: [{ name: 'todo_toggle', from: 'file', path: 'todos/views.py', find: 'def todo_toggle(request, pk)', note: 'Its second parameter is called pk, so the capture must be called pk too.' }],
          result: 'Django calls todo_toggle(request, pk=3) for a POST to /toggle/3/.',
        },
        {
          marker: "TODO: 'delete",
          goal: '/delete/<id>/ goes to views.todo_delete, named todo_delete.',
          options: [
            { code: "path('delete/<int:pk>/', views.todo_delete, name='todo_delete'),", why: 'Same shape as toggle, with its own view and its own name.' },
            { code: "path('delete/<int:pk>/', views.todo_toggle, name='todo_delete'),", why: 'Delete would toggle instead. Each path needs its own view.' },
            { code: "path('delete/<int:pk>/', views.todo_delete),", why: "Without a name, {% url 'todo_delete' todo.id %} in the list page fails with NoReverseMatch." },
          ],
          answer: 0,
          checks: ['delete'],
          sources: [{ name: 'todo_delete', from: 'file', path: 'todos/views.py', find: 'def todo_delete(request, pk)', note: 'Written for you in views.py, POST only.' }],
          result: "The list page's Delete form posts to {% url 'todo_delete' todo.id %}, which becomes /delete/3/.",
        },
      ],
    },
    {
      id: 'project-urls',
      world: 'views',
      kind: 'edit',
      title: 'Plug the app into the project',
      summary: "Include the todos URLs in the project's root URL table.",
      lesson: `config/urls.py is the first URL table Django reads (ROOT_URLCONF in settings.py points at it). Right now it only knows the admin site.

\`include('todos.urls')\` hands every other path to the app's own table. Mounted at \`''\`, the app's \`''\` becomes the home page and \`'add/'\` becomes /add/. Keep the admin line: only add.`,
      path: 'config/urls.py',
      about: 'The root URL table. Apps plug their own URLs in here.',
      starter: URLS_STARTER,
      solution: URLS_SOLUTION,
      checks: [
        { id: 'import', name: 'include is imported', hint: 'from django.urls import include, path', type: 'matches', value: /from\s+django\.urls\s+import\s+[\w\s,()]*\binclude\b/.source },
        { id: 'mount', name: 'The todos app answers at the site root', hint: "Add path('', include('todos.urls')), to urlpatterns.", type: 'includes', value: "path('', include('todos.urls'))" },
        { id: 'admin', name: 'The admin site is still there', hint: "Only add a line: keep path('admin/', admin.site.urls).", type: 'includes', value: "path('admin/', admin.site.urls)" },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          span: 2,
          goal: 'Import include from django.urls, next to path.',
          options: [
            { code: 'import include', why: "include is not a module: it lives in django.urls. Python stops with ModuleNotFoundError, and path is no longer imported either." },
            { code: 'from django import include, path', why: "Both live in django.urls, not at the top of the django package: ImportError: cannot import name 'include' from 'django'." },
            { code: 'from django.urls import include, path', why: 'One import line can bring several names from the same module.' },
          ],
          answer: 2,
          checks: ['import'],
          sources: [
            { name: 'include', from: 'import', note: 'Django\'s function that hands a whole URL table to another urls.py. It lives in django.urls, next to path.' },
            { name: 'path', from: 'import', find: 'from django.urls import path', note: 'Already imported on the next line. Keep it.' },
          ],
          result: 'include can now be used in urlpatterns, below.',
        },
        {
          marker: 'TODO 2:',
          goal: "Send every other URL to the todos app's urls.py, mounted at the site root.",
          options: [
            { code: "path('', include(todos.urls)),", why: 'Without quotes, Python looks for a variable named todos and stops with NameError. include takes the module name as text.' },
            { code: "path('', include('todos.urls')),", why: "'' mounts it at the root, and 'todos.urls' names the module todos/urls.py." },
            { code: "path('todos/', include('todos.urls')),", why: "Then the list lives at /todos/ and the form at /todos/add/, and the home page, /, answers 404." },
          ],
          answer: 1,
          checks: ['mount'],
          sources: [
            { name: 'include', from: 'import', find: 'import include', note: 'Imported in gap 1.' },
            { name: 'todos.urls', from: 'file', path: 'todos/urls.py', find: 'urlpatterns = [', note: "The app's own URL table, from the last level." },
          ],
          result: "Django tries admin/ first. Everything else goes to todos/urls.py, where '' is the list and 'add/' is /add/.",
        },
      ],
    },
    {
      id: 'views-bug-hunt',
      world: 'views',
      kind: 'bugfix',
      boss: true,
      title: 'Bug hunt: views.py',
      summary: 'Someone "tidied up" the views. Four tests fail. Fix them.',
      lesson: `Your teammate "tidied up" views.py on Friday evening. Now:
- the list page always says "No todos yet", even with todos in the database
- pressing Complete does nothing
- deleting a todo that is already gone shows a 500 error page instead of a 404
- anyone, or any crawler, who opens a link to /delete/3/ deletes todo 3

Four bugs, four failing tests. todo_create is yours from earlier and still works: keep it that way.`,
      path: 'todos/views.py',
      about: 'The logic: list, create, toggle and delete todos.',
      starter: VIEWS_BUGGY,
      solution: VIEWS,
      checks: [
        { id: 'list-context', name: 'GET / sends the todos to the template', hint: "render() takes a third argument, the context: the names the template can use. Without {'todos': todos} the loop has nothing to show.", type: 'includes', value: "render(request, 'todos/todo_list.html', {'todos': todos})" },
        { id: 'create', name: 'POST /add/ still saves the todo and redirects', hint: "todo_create was fine. Put back: if form.is_valid(): form.save(), then return redirect('todo_list').", type: 'matches', value: /if\s+form\.is_valid\(\):\s*\n\s*form\.save\(\)\s*\n\s*return\s+redirect\(\s*["']todo_list["']\s*\)/.source },
        { id: 'toggle-save', name: 'POST /toggle/<pk>/ saves the change', hint: 'Changing todo.completed only changes the Python object. Nothing reaches the database until todo.save().', type: 'matches', value: /todo\.completed\s*=\s*not\s+todo\.completed\s*\n\s*todo\.save\(\)/.source },
        { id: 'delete-404', name: 'Deleting a missing todo answers 404, not 500', hint: 'Todo.objects.get raises DoesNotExist when nothing matches, and Django turns that into a 500. get_object_or_404(Todo, pk=pk) answers 404 Not Found instead.', type: 'matches', value: /def\s+todo_delete\(\s*request\s*,\s*pk\s*\):\s*\n\s*todo\s*=\s*get_object_or_404\(\s*Todo\s*,\s*pk\s*=\s*pk\s*\)/.source },
        { id: 'delete-post', name: 'Deleting only happens on a POST', hint: 'A plain link (a GET) can be followed by a prefetching browser, a crawler or a stray click. Put @require_POST on the line above def todo_delete, as on todo_toggle.', type: 'matches', value: /@require_POST\s*\n\s*def\s+todo_delete\b/.source },
      ],
    },

    // ---- World 4: Template Castle ----------------------------------------------------------
    {
      id: 'template-folders',
      world: 'templates',
      kind: 'command',
      title: 'Folders for templates and static files',
      summary: 'Make the folders Django looks in for HTML, CSS and JavaScript.',
      lesson: `The views are done; now the pages they draw. Django has two more kinds of files:
- templates: HTML with placeholders, found in each app's templates/ folder (APP_DIRS is True in settings.py)
- static files: CSS and JavaScript, sent to the browser as they are, found in each app's static/ folder

The extra todos/ inside each one is a namespace. Django pools every app's templates together, so the path todos/base.html can never clash with another app's base.html.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Create todos/templates/todos, the parent folder included, in one command.',
          hint: "mkdir -p creates missing parent folders too. (PowerShell's mkdir does that by itself.)",
          accept: ['mkdir -p todos/templates/todos', 'mkdir todos/templates/todos', 'mkdir todos\\templates\\todos', 'md todos\\templates\\todos', 'New-Item -ItemType Directory todos/templates/todos'],
          adds: [{ path: 'todos/templates/todos/', about: "The app's HTML templates." }],
          explain: 'templates/ and the todos/ inside it appeared at once.',
        },
        {
          goal: 'Create todos/static/todos/css and todos/static/todos/js with one command.',
          hint: 'mkdir takes several folders: mkdir -p <first> <second>',
          accept: [
            'mkdir -p todos/static/todos/css todos/static/todos/js',
            'mkdir -p todos/static/todos/js todos/static/todos/css',
            'mkdir todos/static/todos/css todos/static/todos/js',
            'mkdir todos\\static\\todos\\css todos\\static\\todos\\js',
            'mkdir todos\\static\\todos\\css, todos\\static\\todos\\js',
            'mkdir -p todos/static/todos/{css,js}',
          ],
          adds: [
            { path: 'todos/static/todos/css/', about: 'Stylesheets.' },
            { path: 'todos/static/todos/js/', about: 'Scripts.' },
          ],
          explain: 'One folder for stylesheets, one for scripts. Django serves both under /static/.',
        },
      ],
    },
    {
      id: 'base-template',
      world: 'templates',
      kind: 'edit',
      title: 'The base template',
      summary: 'One layout every page inherits: head, header, CSS and JavaScript.',
      lesson: `Every page needs the same <head>, header and links. Instead of copying them, Django pages inherit from one base template:
- base.html holds the shared HTML and leaves named holes: \`{% block title %}\` and \`{% block content %}\`.
- a page starts with \`{% extends 'todos/base.html' %}\` and fills only those blocks.

Static files need the \`static\` tag, which is not built in: \`{% load static %}\` at the top enables it, and \`{% static 'todos/css/style.css' %}\` becomes the file's URL, /static/todos/css/style.css.`,
      path: 'todos/templates/todos/base.html',
      about: 'The layout every page extends: head, header, CSS and JavaScript.',
      starter: BASE_STARTER,
      solution: BASE_SOLUTION,
      checks: [
        { id: 'load-static', name: 'The static tag is loaded first', hint: 'Put {% load static %} on the very first line. Without it, {% static %} fails with "Invalid block tag".', type: 'matches', value: /^\s*\{%\s*load\s+static\s*%\}/.source },
        {
          id: 'stylesheet',
          name: 'style.css is linked through {% static %}',
          hint: `<link rel="stylesheet" href="{% static 'todos/css/style.css' %}"> inside <head>.`,
          type: 'matches',
          value: /<link(?=[^>]*rel=["']stylesheet["'])(?=[^>]*href=["']\{%\s*static\s+["']todos\/css\/style\.css["']\s*%\}["'])[^>]*>/.source,
        },
        { id: 'content-block', name: 'Pages have a content block to fill', hint: 'Inside <main>: {% block content %} then {% endblock %}.', type: 'matches', value: /\{%\s*block\s+content\s*%\}[\s\S]*?\{%\s*endblock(?:\s+content)?\s*%\}/.source },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Load the static tag library, on the very first line.',
          options: [
            { code: '{% load static %}', why: '{% load %} turns on a tag library for this template. static ships with Django but is off until you load it.' },
            { code: '{% static %}', why: "That uses the tag before it exists. Django stops: Invalid block tag on line 1: 'static'. Did you forget to register or load this tag?" },
            { code: "{% include 'static' %}", why: 'include pulls in another template, here one named static, which does not exist: TemplateDoesNotExist.' },
          ],
          answer: 0,
          checks: ['load-static'],
          sources: [
            { name: 'static', from: 'builtin', note: 'A template tag library that ships with Django. Each template that uses {% static %} loads it.' },
            { name: 'STATIC_URL', from: 'file', path: 'config/settings.py', find: "STATIC_URL = 'static/'", note: 'From settings.py: every static file URL starts with /static/.' },
          ],
          result: '{% static %} now works in the rest of this file: the stylesheet below and the script at the bottom.',
        },
        {
          marker: 'TODO 2:',
          goal: 'Link the stylesheet todos/css/style.css, its URL built by {% static %}.',
          options: [
            { code: '<link rel="stylesheet" href="/todos/css/style.css">', why: 'Static files are served under /static/, so this URL answers 404. {% static %} writes the prefix for you.' },
            { code: "<script src=\"{% static 'todos/css/style.css' %}\"></script>", why: 'A script tag runs JavaScript. CSS needs <link rel="stylesheet">.' },
            { code: "<link rel=\"stylesheet\" href=\"{% static 'todos/css/style.css' %}\">", why: 'The path inside static/, and {% static %} turns it into /static/todos/css/style.css.' },
          ],
          answer: 2,
          checks: ['stylesheet'],
          sources: [
            { name: '{% static %}', from: 'here', find: '{% load static %}', note: 'Loaded in gap 1.' },
            { name: 'style.css', from: 'file', note: 'The stylesheet you meet in the next level. It lives in todos/static/todos/css/.' },
          ],
          result: 'Every page that extends base.html gets <link href="/static/todos/css/style.css">, and the browser loads it.',
        },
        {
          marker: 'TODO 3:',
          goal: 'Leave an empty block named content, for each page to fill.',
          options: [
            { code: '{% block content %}', why: "Every block needs its end tag. Without {% endblock %}, Django stops: Unclosed tag on line 16: 'block'." },
            { code: '{% block content %}\n{% endblock %}', why: 'A named hole. A page that extends base.html puts its own HTML in it.' },
            { code: '{% content %}', why: "There is no content tag: Django stops with Invalid block tag 'content'. Holes are made with block." },
          ],
          answer: 1,
          checks: ['content-block'],
          sources: [{ name: 'block', from: 'here', find: '{% block title %}', note: 'The <title> line already has one: a block named title, with a default.' }],
          result: "todo_list.html and todo_form.html start with {% extends 'todos/base.html' %} and fill this block.",
        },
      ],
    },
    {
      id: 'meet-templates',
      world: 'templates',
      kind: 'explore',
      title: 'Meet the pages',
      summary: 'The form page, the stylesheet and one small script.',
      lesson: `Three more files complete the front end:
- todo_form.html extends base.html and draws the TodoForm with \`{{ form.as_p }}\`. Every POST form carries \`{% csrf_token %}\`, a hidden secret without which Django refuses the submit with 403 Forbidden.
- style.css is plain CSS. base.html already links it.
- script.js adds one small touch: it asks before deleting. Django has already drawn the page; JavaScript is an extra here, not the thing that builds the screen.

Open each new file, then answer the question.`,
      adds: [
        { path: 'todos/templates/todos/todo_form.html', about: 'The Add Todo page: the TodoForm inside base.html.', content: TODO_FORM_HTML },
        { path: 'todos/static/todos/css/style.css', about: 'The styles base.html links on every page.', content: STYLE_CSS },
        { path: 'todos/static/todos/js/script.js', about: 'Asks before a todo is deleted. The page works without it.', content: SCRIPT_JS },
      ],
      quiz: {
        question: 'todo_form.html has no <html>, <head> or stylesheet link. Where do they come from?',
        options: ['The browser adds them', "base.html: {% extends %} puts the page's blocks inside it", 'Django builds them from settings.py'],
        answer: 1,
        explain: 'A child template only fills the blocks its parent leaves open. Everything else, from <!DOCTYPE html> to the script tag, comes from base.html.',
      },
    },
    {
      id: 'list-bug-hunt',
      world: 'templates',
      kind: 'bugfix',
      boss: true,
      title: 'Bug hunt: the todo list page',
      summary: 'Crashes, a 403, and a title that runs JavaScript.',
      lesson: `todo_list.html is the home page: it loops over the todos, strikes through finished ones, and gives each a Complete and a Delete button. Both buttons are small POST forms, because they change data.

This version has four bugs:
- the page crashes with "TemplateDoesNotExist: base.html"
- pressing Complete answers "403 Forbidden: CSRF verification failed"
- the page crashes with "NoReverseMatch" for todo_delete
- a todo titled <script>alert('hi')</script> runs that script for everyone who opens the page

Fix them so every test passes.`,
      path: 'todos/templates/todos/todo_list.html',
      about: 'The home page: every todo with its Complete and Delete buttons.',
      starter: LIST_BUGGY,
      solution: LIST_SOLUTION,
      checks: [
        { id: 'extends', name: 'The page extends todos/base.html', hint: 'Templates are found by their path inside templates/, and base.html lives in templates/todos/: {% extends \'todos/base.html\' %}', type: 'matches', value: /^\s*\{%\s*extends\s+["']todos\/base\.html["']\s*%\}/.source },
        {
          id: 'csrf',
          name: 'Both POST forms carry a CSRF token',
          hint: 'Every <form method="post"> needs {% csrf_token %} inside it. The Complete form lost its one.',
          type: 'matches',
          value: /^(?=[\s\S]*<form[^>]*todo_toggle[^>]*>(?:(?!<\/form>)[\s\S])*\{%\s*csrf_token\s*%\})(?=[\s\S]*<form[^>]*todo_delete[^>]*>(?:(?!<\/form>)[\s\S])*\{%\s*csrf_token\s*%\})/.source,
        },
        { id: 'delete-url', name: "The Delete form posts to this todo's URL", hint: "The pattern is delete/<int:pk>/, so {% url %} needs the id too: {% url 'todo_delete' todo.id %}", type: 'matches', value: /\{%\s*url\s+["']todo_delete["']\s+todo\.(?:id|pk)\s*%\}/.source },
        {
          id: 'escaped',
          name: 'Titles are escaped, so a todo cannot inject HTML',
          hint: 'Django escapes {{ }} output, so <script> shows up as text. |safe switches that off. Remove it: {{ todo.title }}',
          type: 'matches',
          value: /^(?![\s\S]*\|\s*safe\b)(?=[\s\S]*\{%\s*else\s*%\}\s*\{\{\s*todo\.title\s*\}\})/.source,
        },
      ],
    },
    {
      id: 'run-site',
      world: 'templates',
      kind: 'command',
      title: 'Run the site',
      summary: 'Start the server, fetch the home page with curl, and watch CSRF protection work.',
      lesson: `Everything is in place. Start the development server and ask it for the home page with curl, the way a browser would.

What comes back is the point of a monolith: finished HTML. The view fetched the todos, the templates turned them into a page, and no JavaScript had to build anything.

Then try to post a todo from curl and watch Django refuse it.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Start the development server.',
          hint: 'python manage.py runserver',
          accept: ['python manage.py runserver', 'python3 manage.py runserver', 'py manage.py runserver'],
          output: "Watching for file changes with StatReloader\nPerforming system checks...\n\nSystem check identified no issues (0 silenced).\nOctober 05, 2026 - 09:31:02\nDjango version 5.2.7, using settings 'config.settings'\nStarting development server at http://127.0.0.1:8000/\nQuit the server with CONTROL-C.",
          explain: 'In a real terminal this keeps running, and you would open a second terminal for the next commands. Or visit http://127.0.0.1:8000/ in a browser.',
        },
        {
          goal: 'Ask for the home page with curl: http://127.0.0.1:8000/',
          hint: 'curl sends a GET request when you only give it a URL.',
          accept: ['curl http://127.0.0.1:8000/', 'curl http://127.0.0.1:8000', 'curl 127.0.0.1:8000', 'curl http://localhost:8000/', 'curl localhost:8000'],
          output: RENDERED_HOME,
          explain: 'Finished HTML. The links point at /static/… and /add/ because {% static %} and {% url %} wrote them. A browser would now fetch style.css and script.js.',
        },
        {
          goal: 'Try to add a todo titled "Learn Django" by posting to /add/ with curl.',
          hint: 'curl -X POST -d "title=Learn Django" http://127.0.0.1:8000/add/',
          accept: ['curl -X POST -d "title=Learn Django" http://127.0.0.1:8000/add/'],
          pattern: 'curl (?=.*(?:-d|--data(?:-raw|-urlencode)?) )(?=.*title=)(?=.*(?:127\\.0\\.0\\.1|localhost):8000/add/).*',
          output: CSRF_FAILURE,
          explain: "403 Forbidden. curl sent no CSRF token, so Django refused, exactly as it would refuse a form on someone else's site. The form at /add/ in your browser carries the token, so it works there.",
        },
      ],
    },

    // ---- World 5: Test Lab -----------------------------------------------------------------
    {
      id: 'first-test',
      world: 'testing',
      kind: 'edit',
      title: 'Write your first tests',
      summary: 'Finish the assertions for the list and create views.',
      lesson: `Django has a test runner built in, so there is nothing to install. Tests live in each app's tests.py, in classes that extend \`TestCase\`. Every test gets a fresh, empty test database, so tests never touch db.sqlite3 and never depend on each other.

\`self.client\` is a fake browser: \`self.client.get(url)\` and \`self.client.post(url, data)\` run the real URLs, views, forms and templates. It skips the CSRF check, so tests can post without a token. \`reverse('todo_list')\` turns a URL name into its path, the way \`{% url %}\` does in templates.

Fill in the four missing assertions.`,
      path: 'todos/tests.py',
      about: 'Tests for the todo views, run on a throwaway test database.',
      starter: TESTS_STARTER,
      solution: TESTS_SOLUTION,
      checks: [
        { id: 'contains', name: "The list test checks the todo's title is on the page", hint: "self.assertContains(response, 'Buy milk')", type: 'includes', value: "self.assertContains(response, 'Buy milk')" },
        { id: 'redirects', name: 'The create test checks the redirect to the list', hint: "self.assertRedirects(response, reverse('todo_list'))", type: 'matches', value: /self\.assertRedirects\(\s*response\s*,\s*(?:reverse\(\s*["']todo_list["']\s*\)|["']\/["'])\s*\)/.source },
        { id: 'saved-one', name: 'The create test checks one todo was saved', hint: 'self.assertEqual(Todo.objects.count(), 1)', type: 'matches', value: /self\.assertEqual\(\s*Todo\.objects\.count\(\)\s*,\s*1\s*\)/.source },
        { id: 'saved-none', name: 'The empty-title test checks nothing was saved', hint: 'self.assertEqual(Todo.objects.count(), 0), or self.assertFalse(Todo.objects.exists())', type: 'matches', value: /self\.assertEqual\(\s*Todo\.objects\.count\(\)\s*,\s*0\s*\)|self\.assertFalse\(\s*Todo\.objects\.exists\(\)\s*\)/.source },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: "Check that the page contains 'Buy milk'.",
          options: [
            { code: "self.assertIn('Buy milk', response)", why: 'response is an object, not text. assertContains reads its HTML for you, and checks the status is 200 too.' },
            { code: "self.assertContains(response, 'Buy milk')", why: 'Passes when the page answered 200 and its HTML contains the text.' },
            { code: "assertContains(response, 'Buy milk')", why: 'assertContains is a method of TestCase, not a free function: NameError. Call it on self.' },
          ],
          answer: 1,
          checks: ['contains'],
          sources: [
            { name: 'self', from: 'param', find: 'def test_list_shows_todos(self)', note: 'The test itself. TestCase gives it every assert method, and a fake browser: self.client.' },
            { name: 'response', from: 'here', find: 'response = self.client.get', note: 'What the list page answered.' },
            { name: 'assertContains', from: 'import', find: 'from django.test import TestCase', note: 'Comes with TestCase, imported on line 1.' },
          ],
          result: 'If the text is missing, the test fails and prints the page it got.',
        },
        {
          marker: 'TODO 2:',
          goal: 'Check that the response redirects to the list.',
          options: [
            { code: 'self.assertEqual(response.status_code, 200)', why: 'After a successful POST the view redirects, so the status is 302. 200 is what an invalid form gets.' },
            { code: "self.assertRedirects(response, 'todo_list')", why: "'todo_list' is the URL's name, not the URL. reverse('todo_list') turns it into '/'." },
            { code: "self.assertRedirects(response, reverse('todo_list'))", why: 'Checks for a 302 to the list, and that the list page itself works.' },
          ],
          answer: 2,
          checks: ['redirects'],
          sources: [
            { name: 'reverse', from: 'import', find: 'from django.urls import reverse', note: "Imported on line 2: the Python version of {% url %}." },
            { name: 'response', from: 'here', find: 'response = self.client.post', note: 'What POST /add/ answered.' },
          ],
        },
        {
          marker: 'TODO 3:',
          goal: 'Check that exactly one todo is now in the database.',
          options: [
            { code: 'self.assertEqual(Todo.objects.count(), 1)', why: 'count() asks the test database how many rows the table has.' },
            { code: 'self.assertEqual(Todo.objects.all(), 1)', why: 'all() is a QuerySet of rows, never equal to the number 1. Count them: count().' },
            { code: 'self.assertEqual(Todo.count(), 1)', why: 'Queries go through the manager, Todo.objects. The model class itself has no count: AttributeError.' },
          ],
          answer: 0,
          checks: ['saved-one'],
          sources: [
            { name: 'Todo', from: 'import', find: 'from .models import Todo', note: 'The model, imported on line 4.' },
            { name: 'objects', from: 'builtin', note: 'Django gives every model a manager named objects: Todo.objects.count(), .all(), .create().' },
          ],
        },
        {
          marker: 'TODO 4:',
          goal: 'Check that nothing was saved.',
          options: [
            { code: 'self.assertIsNone(Todo.objects)', why: 'Todo.objects is the manager, which always exists. Ask it how many rows there are: count().' },
            { code: 'self.assertEqual(Todo.objects.count(), 0)', why: 'No rows: the empty title never reached the database.' },
            { code: 'self.assertEqual(response.status_code, 302)', why: 'That checks the opposite: a redirect means the todo was saved. Here the form comes back with 200.' },
          ],
          answer: 1,
          checks: ['saved-none'],
          sources: [{ name: 'Todo', from: 'import', find: 'from .models import Todo', note: 'The model, imported on line 4.' }],
          result: 'Together with the 200 above, this proves an empty title is turned back before it reaches the database.',
        },
      ],
    },
    {
      id: 'run-tests',
      world: 'testing',
      kind: 'command',
      title: 'Run the tests',
      summary: 'Run the suite, then see which lines it covers.',
      lesson: `\`python manage.py test\` finds the tests in every app and runs them. Green means the views behave the way your tests say, and keep behaving that way: run them before every commit and a broken change can't sneak in.

coverage then shows which lines the tests actually ran. It is a map of what is still untested, not a score to chase.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Run the test suite.',
          hint: 'manage.py has a command for it: python manage.py test',
          accept: ['python manage.py test', 'python manage.py test todos', 'python3 manage.py test', 'py manage.py test'],
          output: TEST_RUN,
          explain: 'Three dots, three passing tests. The test database was created and thrown away again.',
        },
        {
          goal: 'Install coverage.',
          hint: 'pip install and the package name.',
          accept: ['pip install coverage', 'python -m pip install coverage', 'pip3 install coverage'],
          output: 'Collecting coverage\n  Downloading coverage-7.10.7-cp312-cp312-manylinux_2_17_x86_64.whl (250 kB)\nInstalling collected packages: coverage\nSuccessfully installed coverage-7.10.7',
          explain: 'coverage is a development tool, so it stays out of requirements.txt here. Bigger projects list such tools in a separate requirements-dev.txt.',
        },
        {
          goal: 'Run the tests again, this time through coverage.',
          hint: 'coverage run, then the same command without python: coverage run manage.py test',
          accept: ['coverage run manage.py test', 'coverage run --source=. manage.py test', 'coverage run --source="." manage.py test', 'python -m coverage run manage.py test'],
          output: TEST_RUN,
          adds: [{ path: '.coverage', about: 'The lines coverage saw run. Ignored by git.', generated: true }],
          explain: 'Same result, but coverage recorded every line that ran in .coverage.',
        },
        {
          goal: 'Print the coverage report.',
          hint: 'coverage report',
          accept: ['coverage report', 'coverage report -m', 'python -m coverage report'],
          output: COVERAGE_REPORT,
          explain: 'views.py has untested lines: todo_toggle and todo_delete. Testing them is a good next step.',
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

.gitignore keeps venv/, __pycache__/, db.sqlite3, .coverage and .env out of every commit: requirements.txt and the migrations are enough to rebuild them. The locked files go in like everything else: a real project has them too.

In the next level you send this commit to GitHub.`,
      cwd: '',
      env: VENV,
      steps: [
        { goal: 'Create a git repository here.', hint: 'git, then the word for "start".', accept: ['git init'], output: 'Initialized empty Git repository in /todo-django/.git/', adds: [{ path: '.git/', about: "Git's database of every commit. Never edit it by hand.", generated: true }] },
        ...GIT_IDENTITY,
        { goal: 'Stage every file.', hint: 'git add with a dot stages everything under the current folder.', accept: ['git add .', 'git add -A', 'git add --all'], explain: 'Nothing is printed: staging is silent. venv/, __pycache__/ and db.sqlite3 are skipped because .gitignore lists them.' },
        {
          goal: 'Commit with a message, for example "feat: Django todo app".',
          hint: 'git commit -m "your message"',
          accept: ['git commit -m "feat: Django todo app"'],
          pattern: 'git commit -m ".+"',
          output: '[main (root-commit) 8c1d2e4] feat: Django todo app\n 24 files changed, 548 insertions(+)',
          explain: 'One commit, every file, stamped with your name. Next, send it to GitHub.',
        },
      ],
    },
    {
      id: 'push-github',
      world: 'production',
      kind: 'command',
      title: 'Push to GitHub',
      summary: 'Create a token, connect your repository to GitHub and push your commit.',
      lesson: pushLesson('todo-django'),
      cwd: '',
      env: VENV,
      steps: pushSteps('todo-django', 33),
    },
    {
      id: 'trace-request',
      world: 'production',
      kind: 'architecture',
      boss: true,
      title: 'Final boss: trace a request',
      summary: 'Put every stop of "open the home page" in order, from URL to finished HTML.',
      lesson: `You have built every piece. Now prove you know how they connect.

A user opens http://127.0.0.1:8000/. Put the stops that request passes through in order, from the first URL table to the HTML Django sends back. Each card lists the files that do that job: open them if you need a reminder.`,
      nodes: [
        { id: 'project-urls', label: 'Project URLs', role: "config/urls.py matches the empty path and hands it to the todos app with include().", files: ['config/urls.py'] },
        { id: 'app-urls', label: 'App URLs', role: "todos/urls.py matches '' to views.todo_list.", files: ['todos/urls.py'] },
        { id: 'view', label: 'View', role: 'todo_list asks the model for every todo.', files: ['todos/views.py'] },
        { id: 'model', label: 'Model', role: 'Todo.objects.all() becomes one SELECT, newest first thanks to Meta.ordering.', files: ['todos/models.py'] },
        { id: 'database', label: 'Database', role: 'SQLite returns the rows of the todos_todo table, which the migration created.', files: ['todos/migrations/0001_initial.py', 'config/settings.py'] },
        { id: 'template', label: 'Template', role: 'render() fills todo_list.html, inside base.html, with the todos. {% static %} writes the CSS and JS links.', files: ['todos/templates/todos/todo_list.html', 'todos/templates/todos/base.html'] },
      ],
      returnTrip: 'Django sends the finished HTML back to the browser, which then fetches style.css and script.js from /static/. Adding a todo takes the same road: the form posts to /add/, todo_create checks it with TodoForm, saves it, and redirects back here.',
    },
  ],
  glossary: GLOSSARY,
}

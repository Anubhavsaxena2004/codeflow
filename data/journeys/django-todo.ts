import type { Project } from '@/lib/journeys/types'

// Django Todo API. Setup and database worlds for now: every startproject/startapp command
// generates the same files the real one does, so learners see where each file comes from.

const README = `# Todo API (Django)

A todo API built with Django.

## Setup

    python -m venv venv
    source venv/bin/activate          # Windows: venv\\Scripts\\activate
    pip install -r requirements.txt
    python manage.py migrate
    python manage.py runserver

## Layout

- config/: the project. Settings and the root URL table.
- todos/: an app. One feature with its own models, views and tests.
- manage.py: Django's command-line tool.
`

const GITIGNORE = `# The virtual environment is rebuilt from requirements.txt
venv/

__pycache__/
*.pyc

# Local database and secrets
db.sqlite3
.env
`

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

const URLS = `"""
URL configuration for config project.

The urlpatterns list routes URLs to views.
"""
from django.contrib import admin
from django.urls import path

urlpatterns = [
    path('admin/', admin.site.urls),
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

const VENV = '(venv)'

export const djangoTodo: Project = {
  id: 'django-todo',
  track: 'django',
  title: 'Todo API',
  summary: 'Set up a Django project the way professionals do: venv, project, app, models, migrations.',
  projectName: 'todo-django',
  folders: {
    venv: 'A private Python for this project. Rebuilt from requirements.txt, never committed.',
    config: 'The project: settings and the root URL table. One per site.',
    todos: 'An app: one feature with its own models, views, admin and tests.',
    'todos/migrations': 'Database changes, generated from models.py by makemigrations.',
  },
  worlds: [
    { id: 'setup', title: 'Setup Village', subtitle: 'Virtualenv, Django, a project and your first app', theme: 'village' },
    { id: 'database', title: 'Database Dungeon', subtitle: 'Models, migrations and the dev server', theme: 'dungeon' },
  ],
  levels: [
    {
      id: 'big-picture',
      world: 'setup',
      kind: 'explore',
      title: 'Projects and apps',
      summary: 'How Django splits a site into one project and many apps.',
      lesson: `Django organises code in two layers:
- the project holds site-wide settings and the root URL table. You create it once.
- apps are features: todos, accounts, payments. Each has its own models, views and tests, and the project lists the apps it uses.

Over the next levels you will type the same commands a Django developer types on day one, and watch each one generate its files. Start with the two files every repository needs.`,
      adds: [
        { path: 'README.md', about: 'How to set up and run the project.', content: README },
        { path: '.gitignore', about: 'venv/, caches, the local database and secrets stay out of git.', content: GITIGNORE },
      ],
      quiz: {
        question: 'Where does the code for a "todos" feature live in Django?',
        options: ['In the project folder (config/)', 'In its own app folder (todos/)', 'Inside manage.py'],
        answer: 1,
        explain: 'Each feature is an app with its own folder. The project only lists the apps it uses in INSTALLED_APPS.',
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

The final dot matters. \`django-admin startproject config .\` puts manage.py right here, in the project root. Without it you get an extra nested folder (config/config/) that confuses everyone.`,
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
            { path: 'config/settings.py', about: 'Every setting of the site: installed apps, database, middleware.', content: SETTINGS },
            { path: 'config/urls.py', about: 'The root URL table. Apps plug their own URLs in here.', content: URLS },
            { path: 'config/asgi.py', about: 'Entry point for async servers like Uvicorn.', content: serverEntry('asgi') },
            { path: 'config/wsgi.py', about: 'Entry point for classic servers like Gunicorn.', content: serverEntry('wsgi') },
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
      lesson: `Features live in apps. \`python manage.py startapp todos\` creates a todos/ folder with a file for each job: models for data, views for request handlers, admin for the admin site, tests, and a migrations/ package for database changes.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Create an app called todos.',
          hint: 'Use manage.py: python manage.py startapp <name>',
          accept: ['python manage.py startapp todos', 'python3 manage.py startapp todos', 'py manage.py startapp todos', 'django-admin startapp todos'],
          adds: [
            { path: 'todos/__init__.py', about: 'Marks todos/ as a Python package.', content: '' },
            { path: 'todos/admin.py', about: 'Register models here to manage them in the admin site.', content: 'from django.contrib import admin\n\n# Register your models here.\n' },
            { path: 'todos/apps.py', about: "The app's configuration class.", content: APPS_PY },
            { path: 'todos/migrations/__init__.py', about: 'Makes migrations/ a package, so Django can find the migrations.', content: '' },
            { path: 'todos/models.py', about: 'Database tables, as Python classes.', content: 'from django.db import models\n\n# Create your models here.\n' },
            { path: 'todos/tests.py', about: 'Tests for this app.', content: 'from django.test import TestCase\n\n# Create your tests here.\n' },
            { path: 'todos/views.py', about: 'Functions that handle requests.', content: 'from django.shortcuts import render\n\n# Create your views here.\n' },
          ],
          explain: 'Django does not know about the app yet. That is the next level.',
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
      lesson: `Creating an app folder is not enough: Django only loads the apps listed in \`INSTALLED_APPS\` in settings.py. An unlisted app's models get no tables, and its migrations never run.

Add \`'todos'\` to the end of the list. (The longer form \`'todos.apps.TodosConfig'\` works too.)`,
      path: 'config/settings.py',
      about: 'Every setting of the site: installed apps, database, middleware.',
      starter: SETTINGS,
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
    },
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
      title: 'Migrate and run',
      summary: 'Turn the model into a table, then start the development server.',
      lesson: `Models describe tables; migrations create them. It is a two-step dance:
- \`makemigrations\` compares your models with the existing migrations and writes a new migration file describing the change.
- \`migrate\` applies every migration that has not run yet to the database.

Migration files are code: commit them, so every copy of the project builds the same tables.`,
      cwd: '',
      env: VENV,
      steps: [
        {
          goal: 'Generate a migration for the todos app.',
          hint: 'python manage.py makemigrations',
          accept: ['python manage.py makemigrations', 'python manage.py makemigrations todos', 'python3 manage.py makemigrations', 'py manage.py makemigrations'],
          output: "Migrations for 'todos':\n  todos/migrations/0001_initial.py\n    + Create model Todo",
          adds: [{ path: 'todos/migrations/0001_initial.py', about: 'Creates the todos_todo table. Generated from models.py.', content: MIGRATION }],
          explain: 'Open the new migration: it lists every column of your model, plus the id Django adds for you.',
        },
        {
          goal: 'Apply all migrations to the database.',
          hint: 'python manage.py migrate',
          accept: ['python manage.py migrate', 'python3 manage.py migrate', 'py manage.py migrate'],
          output:
            'Operations to perform:\n  Apply all migrations: admin, auth, contenttypes, sessions, todos\nRunning migrations:\n  Applying contenttypes.0001_initial... OK\n  Applying auth.0001_initial... OK\n  Applying admin.0001_initial... OK\n  Applying sessions.0001_initial... OK\n  Applying todos.0001_initial... OK',
          adds: [{ path: 'db.sqlite3', about: 'The local SQLite database. Ignored by git.', generated: true }],
          explain: 'db.sqlite3 appeared: your tables, plus the ones built-in apps like auth and admin need.',
        },
        {
          goal: 'Start the development server.',
          hint: 'python manage.py runserver',
          accept: ['python manage.py runserver', 'python3 manage.py runserver', 'py manage.py runserver'],
          output: "Watching for file changes with StatReloader\nPerforming system checks...\n\nSystem check identified no issues (0 silenced).\nOctober 05, 2026 - 09:31:02\nDjango version 5.2.7, using settings 'config.settings'\nStarting development server at http://127.0.0.1:8000/\nQuit the server with CONTROL-C.",
          explain: 'Open http://127.0.0.1:8000/admin/ in a browser and you have a working Django site.',
        },
      ],
    },
  ],
}

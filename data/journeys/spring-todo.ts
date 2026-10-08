import type { ScaffoldLine } from '@/data/challenges'
import type { JourneyTerm, Project } from '@/lib/journeys/types'
import { GIT_IDENTITY, GIT_TERMS, pushLesson, pushSteps } from './git'

// Spring Boot Todo App, built as a monolith: one application holds the controller, service,
// repository, JPA entity and the Thymeleaf pages, deployed as one JAR. Spring Initializr generates
// the files the real one does; HELP.md, which the project never uses, is locked in the explorer.
// The Maven Wrapper scripts are generated (not pushed): Initializr writes the real ones on your machine.

const line = (text: string): ScaffoldLine => ({ type: 'line', text })
const lines = (text: string) => text.split('\n').map(line)
const slot = (number: number, indent: number): ScaffoldLine => ({ type: 'slot', slot: number, indent })

const JAVA = 'src/main/java/com/anubhav/todoapp'
const TEST = 'src/test/java/com/anubhav/todoapp'
const RES = 'src/main/resources'
const RUN_COMMANDS = ['.\\mvnw.cmd spring-boot:run', './mvnw spring-boot:run', 'mvnw spring-boot:run', 'mvnw.cmd spring-boot:run', '.\\mvnw spring-boot:run', 'mvn spring-boot:run']

// ---- the whole scenario --------------------------------------------------------------------
const README = `# Todo App (Spring Boot)

A todo list built as a Spring Boot monolith: one application handles the browser's requests, runs the business logic, stores the data in MySQL and renders the HTML pages with Thymeleaf. There is no React and no separate frontend; everything ships as one JAR.

## The stack

    VS Code + Spring Tools
        → Java 21
        → Spring Boot 4.1.1
        → Maven (through the wrapper, mvnw)
        → Spring MVC        handles the requests
        → Thymeleaf         renders the HTML
        → Spring Data JPA   talks to the database, through Hibernate
        → MySQL             stores the todos

## How the project comes to life

    1. Check the tools       java -version, javac -version          (Java 21)
              │
              ▼
    2. Spring Initializr     Ctrl+Shift+P → "Spring Initializr: Create a Maven Project"
              │              Java · Maven · Boot 4.1.1 · Jar · Java 21
              │              com.anubhav / todoapp / com.anubhav.todoapp
              │              Spring Web · Thymeleaf · Spring Data JPA · MySQL Driver · Validation
              ▼
    3. Generated files       pom.xml, mvnw, mvnw.cmd, .mvn/, TodoappApplication.java,
              │              application.properties, static/, templates/, a test, HELP.md (unused)
              ▼
    4. First run             .\\mvnw.cmd spring-boot:run  →  fails: JPA has no database yet
              │
              ▼
    5. Packages              controller/  service/  repository/  model/  dto/  exception/
              │
              ▼
    6. Database              CREATE DATABASE todo_db;  then the spring.datasource settings
              │
              ▼
    7. Data layer            Todo (entity) → TodoRepository → run: Hibernate creates the table
              │
              ▼
    8. Logic                 TodoRequest (DTO) → exceptions → TodoService → TodoController
              │
              ▼
    9. Pages                 templates/todos/*.html, static/css/style.css, static/js/script.js
              │
              ▼
   10. Run, test, package    spring-boot:run · test · clean package → target/todoapp-0.0.1-SNAPSHOT.jar
              │
              ▼
   11. Ship                  git init · git commit · git push

## Folder structure

    todoapp/
    ├── .mvn/wrapper/                       # which Maven version mvnw downloads
    ├── src/
    │   ├── main/
    │   │   ├── java/com/anubhav/todoapp/
    │   │   │   ├── TodoappApplication.java # the main class: starts everything
    │   │   │   ├── controller/             # handles browser requests, picks the page
    │   │   │   ├── service/                # business logic
    │   │   │   ├── repository/             # database access
    │   │   │   ├── model/                  # the Todo entity: one row of the todos table
    │   │   │   ├── dto/                    # what the form may send, with its rules
    │   │   │   └── exception/              # what happens when something goes wrong
    │   │   └── resources/
    │   │       ├── templates/todos/        # base.html, todo-list.html, todo-form.html
    │   │       ├── static/                 # css/style.css, js/script.js
    │   │       └── application.properties  # database and JPA settings
    │   └── test/java/com/anubhav/todoapp/  # tests, in the same packages as the code
    ├── .gitignore
    ├── mvnw, mvnw.cmd                      # the Maven Wrapper
    └── pom.xml                             # dependencies and build settings

## What each folder means

- model/: what is the data?
- repository/: how do I reach the database?
- service/: what business logic should happen?
- controller/: how does the browser talk to my application?
- dto/: what data do I accept from a form?
- exception/: what happens when something goes wrong?
- templates/ and static/: what does the user see?

The biggest beginner mistake is putting everything inside TodoController. Each layer only talks to the one below it.

## The request cycle

Opening the list:

    Browser ── GET /todos ──▶ TodoController ──▶ TodoService ──▶ TodoRepository
                                                                      │
                                                               JPA / Hibernate
                                                                      │
                                                                    MySQL
                                                                      │
    Browser ◀── HTML ── Thymeleaf (todo-list.html) ◀── TodoController ◀┘

Adding a todo:

    GET /todos/new   → the empty form
    POST /todos      → @Valid checks the TodoRequest
                         ├── errors → the form again, with the messages
                         └── valid  → TodoService saves a Todo → redirect:/todos
    GET /todos       → the list, with the new todo on top

## Where each file comes from

    Spring Initializr
        ├── pom.xml
        ├── mvnw, mvnw.cmd, .mvn/wrapper/maven-wrapper.properties
        ├── .gitignore, .gitattributes
        ├── src/main/java/com/anubhav/todoapp/TodoappApplication.java
        ├── src/main/resources/application.properties
        ├── src/main/resources/static/, src/main/resources/templates/
        ├── src/test/java/com/anubhav/todoapp/TodoappApplicationTests.java
        └── HELP.md                                  unused, and ignored by git
    .\\mvnw.cmd spring-boot:run / test / package
        └── target/                                  generated, never committed
    written by you
        ├── controller/TodoController.java
        ├── service/TodoService.java
        ├── repository/TodoRepository.java
        ├── model/Todo.java
        ├── dto/TodoRequest.java
        ├── exception/ResourceNotFoundException.java, GlobalExceptionHandler.java
        ├── templates/todos/base.html, todo-list.html, todo-form.html
        ├── static/css/style.css, static/js/script.js
        └── src/test/java/com/anubhav/todoapp/service/TodoServiceTest.java

## Run it on your computer

You need JDK 21, MySQL and Git. In VS Code, install the Extension Pack for Java and the Spring Boot Extension Pack.

### 1. Create the database

    mysql -u root -p -e "CREATE DATABASE todo_db;"

### 2. Give the app your MySQL password

application.properties reads it from an environment variable, so it is never in a file:

    $env:DB_PASSWORD="your-password"      # PowerShell
    export DB_PASSWORD=your-password      # macOS / Linux

### 3. Run, test, package

    .\\mvnw.cmd spring-boot:run              # http://localhost:8080/todos
    .\\mvnw.cmd test
    .\\mvnw.cmd clean package                # target/todoapp-0.0.1-SNAPSHOT.jar
    java -jar target/todoapp-0.0.1-SNAPSHOT.jar

On macOS and Linux, use ./mvnw instead of .\\mvnw.cmd.

## Push it to GitHub

### 1. Create an empty repository

On github.com, click + → New repository. Name it todoapp and leave "Add a README file" unticked, so the repository starts empty.

### 2. Create a personal access token

GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) → Generate new token. Tick the repo scope, pick an expiry, then generate it and copy it: GitHub shows it only once. Git asks for it instead of your password.

### 3. Commit and push

From the todoapp folder:

    git init
    git config --global user.name "Your Name"          # once per computer
    git config --global user.email "you@example.com"   # the email on your GitHub account
    git add .
    git commit -m "feat: Spring Boot todo app"
    git remote add origin https://github.com/your-username/todoapp.git
    git branch -M main
    git push -u origin main                             # password: paste the token

Never commit target/, .env files or real passwords. Initializr's .gitignore covers target/ and IDE folders, not your secrets: that is why the database password lives in DB_PASSWORD.
`

// ---- what Spring Initializr writes --------------------------------------------------------
const POM = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>4.1.1</version>
        <relativePath/> <!-- lookup parent from repository -->
    </parent>
    <groupId>com.anubhav</groupId>
    <artifactId>todoapp</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>todoapp</name>
    <description>Todo app with Spring Boot</description>
    <properties>
        <java.version>21</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-thymeleaf</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-webmvc</artifactId>
        </dependency>

        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>

</project>
`

const GITIGNORE = `HELP.md
target/
.mvn/wrapper/maven-wrapper.jar
!**/src/main/**/target/
!**/src/test/**/target/

### STS ###
.apt_generated
.classpath
.factorypath
.project
.settings
.springBeans
.sts4-cache

### IntelliJ IDEA ###
.idea
*.iws
*.iml
*.ipr

### NetBeans ###
/nbproject/private/
/nbbuild/
/dist/
/nbdist/
/.nb-gradle/
build/
!**/src/main/**/build/
!**/src/test/**/build/

### VS Code ###
.vscode/
`

const GITATTRIBUTES = `/mvnw text eol=lf
*.cmd text eol=crlf
`

const HELP_MD = `# Getting Started

### Reference Documentation
For further reference, please consider the following sections:

* [Official Apache Maven documentation](https://maven.apache.org/guides/index.html)
* [Spring Boot Maven Plugin Reference Guide](https://docs.spring.io/spring-boot/4.1.1/maven-plugin)
* [Spring Web](https://docs.spring.io/spring-boot/4.1.1/reference/web/servlet.html)
* [Thymeleaf](https://docs.spring.io/spring-boot/4.1.1/reference/web/servlet.html#web.servlet.spring-mvc.template-engines)
* [Spring Data JPA](https://docs.spring.io/spring-boot/4.1.1/reference/data/sql.html#data.sql.jpa-and-spring-data)
* [Validation](https://docs.spring.io/spring-boot/4.1.1/reference/io/validation.html)

### Guides
The following guides illustrate how to use some features concretely:

* [Serving Web Content with Spring MVC](https://spring.io/guides/gs/serving-web-content/)
* [Handling Form Submission](https://spring.io/guides/gs/handling-form-submission/)
* [Accessing data with MySQL](https://spring.io/guides/gs/accessing-data-mysql/)
* [Validating Form Input](https://spring.io/guides/gs/validating-form-input/)
`

const WRAPPER_PROPERTIES = `wrapperVersion=3.3.4
distributionType=only-script
distributionUrl=https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.11/apache-maven-3.9.11-bin.zip
`

const MVNW = `#!/bin/sh
# ----------------------------------------------------------------------------
# Apache Maven Wrapper startup script, version 3.3.4
#
# Finds Maven in ~/.m2/wrapper, downloading the version named in
# .mvn/wrapper/maven-wrapper.properties the first time, then runs it.
# ----------------------------------------------------------------------------
# … (about 250 lines; Spring Initializr writes the full script on your machine)
`

const MVNW_CMD = `@REM ----------------------------------------------------------------------------
@REM Apache Maven Wrapper startup batch script, version 3.3.4
@REM
@REM The Windows twin of mvnw: run it as .\\mvnw.cmd from PowerShell.
@REM ----------------------------------------------------------------------------
@REM … (Spring Initializr writes the full script on your machine)
`

const MAIN_CLASS = `package com.anubhav.todoapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TodoappApplication {

    public static void main(String[] args) {
        SpringApplication.run(TodoappApplication.class, args);
    }

}
`

const CONTEXT_TEST = `package com.anubhav.todoapp;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class TodoappApplicationTests {

    @Test
    void contextLoads() {
    }

}
`

const PROPERTIES_STARTER = `spring.application.name=todoapp

# TODO 1: spring.datasource.url, the JDBC address of todo_db on your MySQL: jdbc:mysql://localhost:3306/todo_db
# TODO 2: spring.datasource.username: root
# TODO 3: spring.datasource.password, read from the environment variable DB_PASSWORD: \${DB_PASSWORD}

# TODO 4: spring.jpa.hibernate.ddl-auto=update, so Hibernate creates the tables from your entities
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

server.port=8080
`

const PROPERTIES_SOLUTION = `spring.application.name=todoapp

# Where the database lives. The password comes from an environment variable, never from this file.
spring.datasource.url=jdbc:mysql://localhost:3306/todo_db
spring.datasource.username=root
spring.datasource.password=\${DB_PASSWORD}

# Hibernate creates and updates the tables from your entities (fine for learning)
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

server.port=8080
`

// ---- the data layer -------------------------------------------------------------------------
const ENTITY_SOLUTION = `package com.anubhav.todoapp.model;

import jakarta.persistence.*;

// One row of the todos table. Hibernate creates the table from this class (ddl-auto=update).
@Entity
@Table(name = "todos")
public class Todo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    private boolean completed;

    // JPA needs a no-argument constructor to build objects from rows
    public Todo() {
    }

    public Todo(String title, boolean completed) {
        this.title = title;
        this.completed = completed;
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public boolean isCompleted() {
        return completed;
    }

    public void setCompleted(boolean completed) {
        this.completed = completed;
    }
}
`

const ENTITY_BUGGY = ENTITY_SOLUTION.replace('import jakarta.persistence.*;', 'import javax.persistence.*;')
  .replace('@Entity\n', '')
  .replace('    @GeneratedValue(strategy = GenerationType.IDENTITY)\n', '')
  .replace('    // JPA needs a no-argument constructor to build objects from rows\n    public Todo() {\n    }\n\n', '')

const REPOSITORY_STARTER = `package com.anubhav.todoapp.repository;

import com.anubhav.todoapp.model.Todo;
import org.springframework.data.jpa.repository.JpaRepository;

// TODO: extend JpaRepository, for Todo entities whose id is a Long
public interface TodoRepository {
}
`

const REPOSITORY_SOLUTION = `package com.anubhav.todoapp.repository;

import com.anubhav.todoapp.model.Todo;
import org.springframework.data.jpa.repository.JpaRepository;

// No code needed: Spring Data JPA writes the class at startup, with findAll, findById, save, delete and more
public interface TodoRepository extends JpaRepository<Todo, Long> {
}
`

// ---- the logic --------------------------------------------------------------------------------
const DTO_SOLUTION = `package com.anubhav.todoapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// What the Add Todo form may send: only the title. Never the id, never completed.
public class TodoRequest {

    @NotBlank(message = "Title cannot be empty")
    @Size(max = 200, message = "Title cannot exceed 200 characters")
    private String title;

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }
}
`

const DTO_STARTER = DTO_SOLUTION.replace(
  '    @NotBlank(message = "Title cannot be empty")\n    @Size(max = 200, message = "Title cannot exceed 200 characters")\n',
  '    // TODO 1: reject a missing or blank title, with the message "Title cannot be empty"\n    // TODO 2: allow at most 200 characters, with the message "Title cannot exceed 200 characters"\n',
)

const NOT_FOUND_EXCEPTION = `package com.anubhav.todoapp.exception;

// Thrown when a todo id does not exist. Unchecked, so methods don't have to declare it.
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
`

const EXCEPTION_HANDLER = `package com.anubhav.todoapp.exception;

import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

// Applies to every controller: one place decides what the user sees when something goes wrong
@ControllerAdvice
public class GlobalExceptionHandler {

    // A missing todo sends the browser back to the list with a message, instead of an error page
    @ExceptionHandler(ResourceNotFoundException.class)
    public String handleNotFound(ResourceNotFoundException exception, RedirectAttributes redirectAttributes) {
        redirectAttributes.addFlashAttribute("error", exception.getMessage());
        return "redirect:/todos";
    }
}
`

const SERVICE_READ_STARTER = `package com.anubhav.todoapp.service;

import com.anubhav.todoapp.dto.TodoRequest;
import com.anubhav.todoapp.exception.ResourceNotFoundException;
import com.anubhav.todoapp.model.Todo;
import com.anubhav.todoapp.repository.TodoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

// TODO 1: annotate class with @Service so Spring creates and manages it
public class TodoService {

    private final TodoRepository todoRepository;

    // TODO 2: constructor injection: pass TodoRepository and assign this.todoRepository = todoRepository

    // Newest first
    public List<Todo> getAllTodos() {
        // TODO 3: return all todos from todoRepository sorted by id descending
    }
}
`

const SERVICE_READ_SOLUTION = `package com.anubhav.todoapp.service;

import com.anubhav.todoapp.dto.TodoRequest;
import com.anubhav.todoapp.exception.ResourceNotFoundException;
import com.anubhav.todoapp.model.Todo;
import com.anubhav.todoapp.repository.TodoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

// The business logic. Controllers call it; it is the only class that talks to the repository.
@Service
public class TodoService {

    private final TodoRepository todoRepository;

    // Constructor injection: Spring creates the repository and passes it in
    public TodoService(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    // Newest first
    public List<Todo> getAllTodos() {
        return todoRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }
}
`

const SERVICE_CREATE_HEAD = `package com.anubhav.todoapp.service;

import com.anubhav.todoapp.dto.TodoRequest;
import com.anubhav.todoapp.exception.ResourceNotFoundException;
import com.anubhav.todoapp.model.Todo;
import com.anubhav.todoapp.repository.TodoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

// The business logic. Controllers call it; it is the only class that talks to the repository.
@Service
public class TodoService {

    private final TodoRepository todoRepository;

    // Constructor injection: Spring creates the repository and passes it in
    public TodoService(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    // Newest first
    public List<Todo> getAllTodos() {
        return todoRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    public Todo getTodoById(Long id) {`

const SERVICE_UPDATE_DELETE_STARTER = `package com.anubhav.todoapp.service;

import com.anubhav.todoapp.dto.TodoRequest;
import com.anubhav.todoapp.exception.ResourceNotFoundException;
import com.anubhav.todoapp.model.Todo;
import com.anubhav.todoapp.repository.TodoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

// The business logic. Controllers call it; it is the only class that talks to the repository.
@Service
public class TodoService {

    private final TodoRepository todoRepository;

    // Constructor injection: Spring creates the repository and passes it in
    public TodoService(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    // Newest first
    public List<Todo> getAllTodos() {
        return todoRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    public Todo getTodoById(Long id) {
        return todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Todo " + id + " not found"));
    }

    public Todo createTodo(TodoRequest request) {
        return todoRepository.save(new Todo(request.getTitle().trim(), false));
    }

    public void toggleTodo(Long id) {
        // TODO 1: load todo with getTodoById, flip completed, and save it
    }

    public void deleteTodo(Long id) {
        // TODO 2: delete todo from todoRepository using getTodoById(id)
    }
}
`

const SERVICE_HEAD = `package com.anubhav.todoapp.service;

import com.anubhav.todoapp.dto.TodoRequest;
import com.anubhav.todoapp.exception.ResourceNotFoundException;
import com.anubhav.todoapp.model.Todo;
import com.anubhav.todoapp.repository.TodoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

// The business logic. Controllers call it; it is the only class that talks to the repository.
@Service
public class TodoService {

    private final TodoRepository todoRepository;

    // Constructor injection: Spring creates the repository and passes it in
    public TodoService(TodoRepository todoRepository) {
        this.todoRepository = todoRepository;
    }

    // Newest first
    public List<Todo> getAllTodos() {
        return todoRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));
    }

    public Todo getTodoById(Long id) {`

const FIND_BODY = `        return todoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Todo " + id + " not found"));`

const SERVICE_MIDDLE = `    }

    public Todo createTodo(TodoRequest request) {
        return todoRepository.save(new Todo(request.getTitle().trim(), false));
    }

    public void toggleTodo(Long id) {`

const TOGGLE_BODY = `        Todo todo = getTodoById(id);
        todo.setCompleted(!todo.isCompleted());
        todoRepository.save(todo);`

const SERVICE_TAIL = `    }

    public void deleteTodo(Long id) {
        todoRepository.delete(getTodoById(id));
    }
}
`

const SERVICE = `${SERVICE_HEAD}\n${FIND_BODY}\n${SERVICE_MIDDLE}\n${TOGGLE_BODY}\n${SERVICE_TAIL}`

const CONTROLLER = `package com.anubhav.todoapp.controller;

import com.anubhav.todoapp.dto.TodoRequest;
import com.anubhav.todoapp.service.TodoService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

// Handles the browser's requests. Each method returns the name of a template to render,
// or "redirect:" plus a URL to send the browser to.
@Controller
@RequestMapping("/todos")
public class TodoController {

    private final TodoService todoService;

    public TodoController(TodoService todoService) {
        this.todoService = todoService;
    }

    // GET /todos: the list page
    @GetMapping
    public String listTodos(Model model) {
        model.addAttribute("todos", todoService.getAllTodos());
        return "todos/todo-list";
    }

    // GET /todos/new: an empty form
    @GetMapping("/new")
    public String showCreateForm(Model model) {
        model.addAttribute("todo", new TodoRequest());
        return "todos/todo-form";
    }

    // POST /todos: validate, save, then redirect so a refresh never posts twice
    @PostMapping
    public String createTodo(@Valid @ModelAttribute("todo") TodoRequest request, BindingResult result) {
        if (result.hasErrors()) {
            return "todos/todo-form";
        }
        todoService.createTodo(request);
        return "redirect:/todos";
    }

    // POST /todos/toggle/{id}: it changes data, so POST, never a plain link
    @PostMapping("/toggle/{id}")
    public String toggleTodo(@PathVariable Long id) {
        todoService.toggleTodo(id);
        return "redirect:/todos";
    }

    // POST /todos/delete/{id}
    @PostMapping("/delete/{id}")
    public String deleteTodo(@PathVariable Long id) {
        todoService.deleteTodo(id);
        return "redirect:/todos";
    }
}
`

const CONTROLLER_STARTER = CONTROLLER.replace('        model.addAttribute("todos", todoService.getAllTodos());\n', '        // TODO 1: hand the todos to the template, under the name "todos"\n')
  .replace(
    '        if (result.hasErrors()) {\n            return "todos/todo-form";\n        }\n        todoService.createTodo(request);\n        return "redirect:/todos";',
    '        // TODO 2: when validation failed, show the form again: it now carries the error messages\n        todoService.createTodo(request);\n        // TODO 3: redirect the browser to /todos instead. Rendering here means a refresh posts the form again.\n        return "todos/todo-list";',
  )

const CONTROLLER_BUGGY = CONTROLLER.replace('import org.springframework.stereotype.Controller;', 'import org.springframework.web.bind.annotation.RestController;')
  .replace('@Controller\n@RequestMapping', '@RestController\n@RequestMapping')
  .replace(
    'public String createTodo(@Valid @ModelAttribute("todo") TodoRequest request, BindingResult result) {\n        if (result.hasErrors()) {\n            return "todos/todo-form";\n        }\n',
    'public String createTodo(@Valid @ModelAttribute("todo") TodoRequest request) {\n',
  )
  .replace('public String toggleTodo(@PathVariable Long id) {\n        todoService.toggleTodo(id);', 'public String toggleTodo(@PathVariable Long todoId) {\n        todoService.toggleTodo(todoId);')
  .replace('@PostMapping("/delete/{id}")', '@GetMapping("/delete/{id}")')

// ---- templates and static files -------------------------------------------------------------
const BASE_STARTER = `<!DOCTYPE html>
<html lang="en" xmlns:th="http://www.thymeleaf.org">
<!-- Shared pieces. Pages pull each one in with th:replace="~{todos/base :: name}". -->

<!-- TODO 1: make this <head> a fragment named head that takes one parameter, title -->
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title th:text="\${title}">Todo App</title>
    <!-- TODO 2: link the stylesheet in static/css, its URL built with th:href and a @{...} link -->
</head>
<body>

<!-- TODO 3: make this header a fragment named navbar -->
<header class="navbar">
    <h1>Todo App</h1>
    <a th:href="@{/todos}">Home</a>
</header>

<script th:fragment="scripts" th:src="@{/js/script.js}"></script>

</body>
</html>
`

const BASE_SOLUTION = `<!DOCTYPE html>
<html lang="en" xmlns:th="http://www.thymeleaf.org">
<!-- Shared pieces. Pages pull each one in with th:replace="~{todos/base :: name}". -->

<head th:fragment="head(title)">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title th:text="\${title}">Todo App</title>
    <link rel="stylesheet" th:href="@{/css/style.css}">
</head>
<body>

<header class="navbar" th:fragment="navbar">
    <h1>Todo App</h1>
    <a th:href="@{/todos}">Home</a>
</header>

<script th:fragment="scripts" th:src="@{/js/script.js}"></script>

</body>
</html>
`

const TODO_FORM_HTML = `<!DOCTYPE html>
<html lang="en" xmlns:th="http://www.thymeleaf.org">
<head th:replace="~{todos/base :: head('Add Todo')}"></head>
<body>

<header th:replace="~{todos/base :: navbar}"></header>

<main class="container">
    <h1>Add Todo</h1>

    <!-- th:object binds the form to the TodoRequest the controller put in the model as "todo" -->
    <form th:action="@{/todos}" th:object="\${todo}" method="post">
        <div class="form-group">
            <label for="title">Todo Title</label>
            <input type="text" id="title" th:field="*{title}" placeholder="Enter your todo" required maxlength="200">
            <!-- The message from @NotBlank or @Size, after a failed POST -->
            <p class="error" th:if="\${#fields.hasErrors('title')}" th:errors="*{title}"></p>
        </div>

        <button type="submit" class="btn">Add Todo</button>
        <a th:href="@{/todos}" class="btn btn-secondary">Cancel</a>
    </form>
</main>

<script th:replace="~{todos/base :: scripts}"></script>
</body>
</html>
`

const STYLE_CSS = `body {
    font-family: Arial, sans-serif;
    background: #f4f4f4;
    margin: 0;
}

.navbar {
    background: #222;
    color: white;
    padding: 20px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.navbar a {
    color: white;
    text-decoration: none;
}

.container {
    width: 80%;
    max-width: 900px;
    margin: 40px auto;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.todo-card {
    background: white;
    padding: 20px;
    margin: 15px 0;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.completed {
    text-decoration: line-through;
    color: gray;
}

.actions {
    display: flex;
    gap: 8px;
}

.btn {
    display: inline-block;
    padding: 10px 15px;
    background: #222;
    color: white;
    text-decoration: none;
    border-radius: 5px;
    border: none;
    cursor: pointer;
}

.btn-secondary {
    background: #666;
}

.delete-btn {
    background: #c0392b;
}

.form-group {
    margin-bottom: 20px;
}

input {
    width: 100%;
    padding: 12px;
    box-sizing: border-box;
}

.error {
    color: #c0392b;
}
`

const SCRIPT_JS = `// Thymeleaf already drew the page. JavaScript only adds small touches on top.

// Ask before deleting: every delete form carries a data-confirm message
document.querySelectorAll("form[data-confirm]").forEach((form) => {
  form.addEventListener("submit", (event) => {
    if (!window.confirm(form.dataset.confirm)) event.preventDefault();
  });
});
`

const LIST_SOLUTION = `<!DOCTYPE html>
<html lang="en" xmlns:th="http://www.thymeleaf.org">
<head th:replace="~{todos/base :: head('My Todos')}"></head>
<body>

<header th:replace="~{todos/base :: navbar}"></header>

<main class="container">
    <div class="header">
        <h1>My Todos</h1>
        <a class="btn" th:href="@{/todos/new}">+ Add Todo</a>
    </div>

    <!-- Set by GlobalExceptionHandler when a todo was not found -->
    <p class="error" th:if="\${error}" th:text="\${error}"></p>

    <div th:if="\${#lists.isEmpty(todos)}" class="empty">
        <p>No todos yet.</p>
    </div>

    <div class="todo-list">
        <div class="todo-card" th:each="todo : \${todos}">
            <div>
                <h3 th:classappend="\${todo.completed} ? 'completed'" th:text="\${todo.title}">Todo title</h3>
                <span th:text="\${todo.completed} ? 'Completed' : 'Pending'">Pending</span>
            </div>

            <!-- Both buttons change data, so each is a small POST form -->
            <div class="actions">
                <form th:action="@{/todos/toggle/{id}(id=\${todo.id})}" method="post">
                    <button type="submit" class="btn" th:text="\${todo.completed} ? 'Undo' : 'Complete'">Complete</button>
                </form>
                <form th:action="@{/todos/delete/{id}(id=\${todo.id})}" method="post" data-confirm="Delete this todo?">
                    <button type="submit" class="btn delete-btn">Delete</button>
                </form>
            </div>
        </div>
    </div>
</main>

<script th:replace="~{todos/base :: scripts}"></script>
</body>
</html>
`

const LIST_BUGGY = LIST_SOLUTION.replace('th:each="todo : ${todos}"', 'th:each="todo : ${todo}"')
  .replace('th:text="${todo.title}"', 'th:utext="${todo.title}"')
  .replace('<form th:action="@{/todos/toggle/{id}(id=${todo.id})}" method="post">', '<form th:action="@{/todos/toggle/{id}(id=${todo.id})}" method="get">')
  .replace('th:action="@{/todos/delete/{id}(id=${todo.id})}"', 'th:action="@{/todos/delete/${todo.id}}"')

// ---- terminal output ------------------------------------------------------------------------
const BANNER = [
  '  .   ____          _            __ _ _',
  " /\\\\ / ___'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\",
  "( ( )\\___ | '_ | '_| | '_ \\/ _` | \\ \\ \\ \\",
  " \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )",
  "  '  |____| .__|_| |_|_| |_\\__, | / / / /",
  ' =========|_|==============|___/=/_/_/_/',
  '',
  ' :: Spring Boot ::                (v4.1.1)',
].join('\n')

const MAVEN_START = `[INFO] Scanning for projects...
[INFO]
[INFO] --------------------------< com.anubhav:todoapp >---------------------------
[INFO] Building todoapp 0.0.1-SNAPSHOT
[INFO] --------------------------------[ jar ]---------------------------------`

const RUN_FAILS = `${MAVEN_START}
[INFO] --- compiler:3.14.0:compile (default-compile) @ todoapp ---
[INFO] Compiling 1 source file with javac [debug parameters release 21] to target/classes
[INFO] --- spring-boot:4.1.1:run (default-cli) @ todoapp ---

${BANNER}

INFO  --- [todoapp] [main] c.anubhav.todoapp.TodoappApplication : Starting TodoappApplication using Java 21.0.8
INFO  --- [todoapp] [main] o.s.b.w.e.tomcat.TomcatWebServer      : Tomcat initialized with port 8080 (http)
WARN  --- [todoapp] [main] ConfigServletWebServerApplicationContext : Exception encountered during context initialization

***************************
APPLICATION FAILED TO START
***************************

Description:

Failed to configure a DataSource: 'url' attribute is not specified and no embedded datasource could be configured.

Reason: Failed to determine a suitable driver class

Action:

Consider the following:
    If you want an embedded database (H2, HSQL or Derby), please put it on the classpath.
    If you have database settings to be loaded from a particular profile you may need to activate it (no profiles are currently active).

[INFO] BUILD FAILURE`

const RUN_STARTS = (sources: number, createTable: boolean) => `${MAVEN_START}
[INFO] --- compiler:3.14.0:compile (default-compile) @ todoapp ---
[INFO] Compiling ${sources} source files with javac [debug parameters release 21] to target/classes
[INFO] --- spring-boot:4.1.1:run (default-cli) @ todoapp ---

${BANNER}

INFO  --- [todoapp] [main] c.anubhav.todoapp.TodoappApplication : Starting TodoappApplication using Java 21.0.8
INFO  --- [todoapp] [main] o.s.b.w.e.tomcat.TomcatWebServer      : Tomcat initialized with port 8080 (http)
INFO  --- [todoapp] [main] com.zaxxer.hikari.HikariDataSource     : HikariPool-1 - Start completed.${createTable ? `
Hibernate:
    create table todos (
        id bigint not null auto_increment,
        title varchar(200) not null,
        completed bit not null,
        primary key (id)
    ) engine=InnoDB` : ''}
INFO  --- [todoapp] [main] j.LocalContainerEntityManagerFactoryBean : Initialized JPA EntityManagerFactory for persistence unit 'default'
INFO  --- [todoapp] [main] o.s.b.w.e.tomcat.TomcatWebServer      : Tomcat started on port 8080 (http) with context path '/'
INFO  --- [todoapp] [main] c.anubhav.todoapp.TodoappApplication : Started TodoappApplication in 3.412 seconds`

const DESCRIBE_TABLE = `Enter password: ********
+-----------+--------------+------+-----+---------+----------------+
| Field     | Type         | Null | Key | Default | Extra          |
+-----------+--------------+------+-----+---------+----------------+
| id        | bigint       | NO   | PRI | NULL    | auto_increment |
| title     | varchar(200) | NO   |     | NULL    |                |
| completed | bit(1)       | NO   |     | NULL    |                |
+-----------+--------------+------+-----+---------+----------------+`

const RENDERED_LIST = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Todos</title>
    <link rel="stylesheet" href="/css/style.css">
</head>
<body>

<header class="navbar">
    <h1>Todo App</h1>
    <a href="/todos">Home</a>
</header>

<main class="container">
    <div class="header">
        <h1>My Todos</h1>
        <a class="btn" href="/todos/new">+ Add Todo</a>
    </div>

    <!-- Set by GlobalExceptionHandler when a todo was not found -->

    <div class="empty">
        <p>No todos yet.</p>
    </div>

    <div class="todo-list">
    </div>
</main>

<script src="/js/script.js"></script>
</body>
</html>`

const RENDERED_FORM_ERROR = `…
<main class="container">
    <h1>Add Todo</h1>

    <!-- th:object binds the form to the TodoRequest the controller put in the model as "todo" -->
    <form action="/todos" method="post">
        <div class="form-group">
            <label for="title">Todo Title</label>
            <input type="text" id="title" placeholder="Enter your todo" required maxlength="200" name="title" value="">
            <!-- The message from @NotBlank or @Size, after a failed POST -->
            <p class="error">Title cannot be empty</p>
        </div>
…`

const TEST_RUN = `${MAVEN_START}
[INFO] --- compiler:3.14.0:testCompile (default-testCompile) @ todoapp ---
[INFO] --- surefire:3.5.4:test (default-test) @ todoapp ---
[INFO]
[INFO] -------------------------------------------------------
[INFO]  T E S T S
[INFO] -------------------------------------------------------
[INFO] Running com.anubhav.todoapp.service.TodoServiceTest
[INFO] Tests run: 3, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 0.412 s -- in com.anubhav.todoapp.service.TodoServiceTest
[INFO] Running com.anubhav.todoapp.TodoappApplicationTests
[INFO] Tests run: 1, Failures: 0, Errors: 0, Skipped: 0, Time elapsed: 3.208 s -- in com.anubhav.todoapp.TodoappApplicationTests
[INFO]
[INFO] Results:
[INFO]
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO]
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------`

const PACKAGE_RUN = `${MAVEN_START}
[INFO] --- clean:3.5.0:clean (default-clean) @ todoapp ---
[INFO] Deleting /todoapp/target
[INFO] --- compiler:3.14.0:compile (default-compile) @ todoapp ---
[INFO] --- surefire:3.5.4:test (default-test) @ todoapp ---
[INFO] Tests run: 4, Failures: 0, Errors: 0, Skipped: 0
[INFO] --- jar:3.4.2:jar (default-jar) @ todoapp ---
[INFO] Building jar: /todoapp/target/todoapp-0.0.1-SNAPSHOT.jar
[INFO] --- spring-boot:4.1.1:repackage (repackage) @ todoapp ---
[INFO] Replacing main artifact /todoapp/target/todoapp-0.0.1-SNAPSHOT.jar with repackaged archive
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------`

const JAR_RUN = `${BANNER}

INFO  --- [todoapp] [main] c.anubhav.todoapp.TodoappApplication : Starting TodoappApplication v0.0.1-SNAPSHOT using Java 21.0.8
INFO  --- [todoapp] [main] o.s.b.w.e.tomcat.TomcatWebServer      : Tomcat started on port 8080 (http) with context path '/'
INFO  --- [todoapp] [main] c.anubhav.todoapp.TodoappApplication : Started TodoappApplication in 2.904 seconds`

// ---- tests ------------------------------------------------------------------------------------
const SERVICE_TEST_SOLUTION = `package com.anubhav.todoapp.service;

import com.anubhav.todoapp.dto.TodoRequest;
import com.anubhav.todoapp.exception.ResourceNotFoundException;
import com.anubhav.todoapp.model.Todo;
import com.anubhav.todoapp.repository.TodoRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// A plain unit test: no Spring, no database. Mockito fakes the repository.
@ExtendWith(MockitoExtension.class)
class TodoServiceTest {

    @Mock
    private TodoRepository todoRepository;

    @InjectMocks
    private TodoService todoService;

    @Test
    void createTodoSavesATrimmedTitle() {
        TodoRequest request = new TodoRequest();
        request.setTitle("  Learn Spring Boot  ");
        when(todoRepository.save(any(Todo.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Todo saved = todoService.createTodo(request);

        assertEquals("Learn Spring Boot", saved.getTitle());
    }

    @Test
    void toggleTodoFlipsCompleted() {
        Todo todo = new Todo("Learn JPA", false);
        when(todoRepository.findById(1L)).thenReturn(Optional.of(todo));

        todoService.toggleTodo(1L);

        assertTrue(todo.isCompleted());
        verify(todoRepository).save(todo);
    }

    @Test
    void deletingAMissingTodoThrows() {
        when(todoRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> todoService.deleteTodo(99L));
        verify(todoRepository, never()).delete(any(Todo.class));
    }
}
`

const SERVICE_TEST_STARTER = SERVICE_TEST_SOLUTION.replace('        assertEquals("Learn Spring Boot", saved.getTitle());', '        // TODO 1: assert the saved title is "Learn Spring Boot", without the spaces')
  .replace('        assertTrue(todo.isCompleted());\n        verify(todoRepository).save(todo);', '        // TODO 2: assert the todo is now completed\n        // TODO 3: verify the repository saved that same todo')
  .replace(
    '        assertThrows(ResourceNotFoundException.class, () -> todoService.deleteTodo(99L));',
    '        // TODO 4: assert deleteTodo(99L) throws ResourceNotFoundException',
  )

const WRAPPER_ABOUT = 'Committed in real projects. Spring Initializr writes the full script on your machine, so CodeFlow keeps its short copy out of your push.'
const TARGET_ABOUT = "Maven's build output: compiled classes, test reports, the JAR. Rebuilt every build, never committed."

// Explained in the workspace's Glossary tab; each level lists the terms its code uses.
const GLOSSARY: JourneyTerm[] = [
  // Tools and the project
  { term: 'monolith', definition: 'One application that does everything: requests, logic, data and the HTML pages, deployed as one JAR.' },
  { term: 'JDK', definition: 'The Java Development Kit: java runs programs, javac compiles them. Spring Boot 4 needs Java 17 or newer; this project uses 21.', match: ['JDK', 'javac'] },
  { term: 'Spring Initializr', definition: 'Generates a ready-to-build Spring Boot project from your choices: build tool, versions, names and dependencies. Built into VS Code, and at start.spring.io.' },
  { term: 'Maven', definition: 'The build tool: downloads the libraries pom.xml lists, then compiles, tests and packages the app.' },
  { term: 'pom.xml', definition: "Maven's project file: the coordinates (groupId, artifactId, version), the Spring Boot parent, the dependencies and the plugins." },
  { term: 'mvnw', definition: 'The Maven Wrapper. ./mvnw (mvnw.cmd on Windows) downloads the right Maven version, so nobody has to install Maven.' },
  { term: 'starter', definition: 'A dependency that brings a whole feature with sensible defaults, like spring-boot-starter-thymeleaf.', match: ['spring-boot-starter'] },
  { term: '@SpringBootApplication', definition: 'Marks the main class. It switches on auto-configuration and scans its own package, and every package below it, for components.' },
  { term: 'package', definition: 'A Java namespace, and a folder: com.anubhav.todoapp.service lives in com/anubhav/todoapp/service/.', match: ['package com.'] },
  { term: 'application.properties', definition: 'Settings as key=value lines: database URL, JPA options, port. ${NAME} reads an environment variable.' },
  { term: 'DataSource', definition: 'The pool of database connections. Spring Boot builds it from the spring.datasource settings; without them, JPA cannot start.' },
  { term: 'environment variable', definition: 'A setting the terminal hands to a program, like DB_PASSWORD. It never lives in a file, so it can never be committed.', match: ['DB_PASSWORD'] },
  { term: 'ddl-auto', definition: 'spring.jpa.hibernate.ddl-auto=update lets Hibernate create and alter tables to match your entities. Handy for learning; real projects use migrations.' },
  { term: 'Tomcat', definition: 'The web server built into Spring Boot. It starts with your app on port 8080; there is nothing to install.' },
  // Data
  { term: '@Entity', definition: 'Marks a class as a JPA entity: each object is a row, each field a column.' },
  { term: '@Id / @GeneratedValue', definition: 'The primary key. GenerationType.IDENTITY lets MySQL number new rows (AUTO_INCREMENT).', match: ['@Id', '@GeneratedValue'] },
  { term: '@Column', definition: 'Column options: nullable = false makes it NOT NULL, length sets the size of the VARCHAR.' },
  { term: 'jakarta.persistence', definition: 'The package of the JPA annotations since Spring Boot 3. Older tutorials use javax.persistence, which no longer exists here.', match: ['jakarta.persistence', 'javax.persistence'] },
  { term: 'Hibernate', definition: 'The JPA implementation Spring Boot uses. It turns entity operations into SQL and rows back into objects.' },
  { term: 'JpaRepository', definition: 'Extend it with your entity and id types, and Spring Data JPA writes findAll, findById, save, delete and more for you.' },
  // Logic
  { term: 'DTO', definition: 'A Data Transfer Object: exactly what a form may send, kept apart from the entity.', match: ['DTO'] },
  { term: '@NotBlank / @Size', definition: 'Validation rules: @NotBlank rejects null, empty and spaces-only text; @Size(max = 200) caps the length.', match: ['@NotBlank', '@Size'] },
  { term: '@Service', definition: 'Marks a class as a Spring bean holding business logic. Spring creates one and passes it to whoever needs it.' },
  { term: 'constructor injection', definition: 'Dependencies arrive as constructor parameters: Spring passes in the beans it created. Fields stay final, and tests can pass in fakes.', match: ['Constructor injection', 'constructor injection'] },
  { term: 'Optional', definition: 'A box that may be empty. findById returns one; orElseThrow opens it or throws.', match: ['Optional', 'orElseThrow'] },
  { term: '@ControllerAdvice', definition: 'A class whose @ExceptionHandler methods apply to every controller.' },
  { term: '@ExceptionHandler', definition: 'Handles one kind of exception thrown by a controller, and decides what the user sees instead.' },
  { term: 'flash attribute', definition: 'A value that survives exactly one redirect, like an error message for the next page.', match: ['addFlashAttribute'] },
  { term: '@Controller', definition: 'A controller whose methods return template names. @RestController writes the return value into the response as it is.', match: ['@Controller', '@RestController'] },
  { term: '@GetMapping / @PostMapping', definition: 'Map a method to GET or POST on a path. @RequestMapping on the class adds a prefix, like /todos.', match: ['@GetMapping', '@PostMapping', '@RequestMapping'] },
  { term: '@PathVariable', definition: 'Takes a value from the path, like the id in /todos/toggle/{id}. Its name must match the {placeholder}.' },
  { term: 'Model', definition: 'What the controller hands to the template: model.addAttribute("todos", list) makes ${todos} available there.', match: ['Model model', 'model.addAttribute'] },
  { term: '@Valid / BindingResult', definition: "@Valid runs the DTO's validation rules; the BindingResult right after it collects the errors instead of throwing.", match: ['@Valid', 'BindingResult'] },
  { term: 'redirect:', definition: 'A view name starting with redirect: sends the browser to another URL, so a refresh never submits a form twice (Post/Redirect/Get).', match: ['redirect:'] },
  // Templates
  { term: 'Thymeleaf', definition: 'The template engine. It fills the th: attributes of plain HTML files in templates/ with data from the model.' },
  { term: 'th:text / th:utext', definition: 'th:text prints a value, escaped. th:utext prints it as raw HTML: never for anything a user typed.', match: ['th:text', 'th:utext'] },
  { term: 'th:each', definition: 'Repeats an element for every item of a list: th:each="todo : ${todos}".' },
  { term: 'th:if', definition: 'Renders the element only when the condition is true. ${#lists.isEmpty(todos)} checks for an empty list.' },
  { term: '@{...}', definition: "A link expression: @{/todos/delete/{id}(id=${todo.id})} builds /todos/delete/3, with the app's context path in front.", match: ['@{'] },
  { term: 'th:object / th:field', definition: "th:object binds a form to a model object; th:field=\"*{title}\" fills the input's name, id and value from its title.", match: ['th:object', 'th:field'] },
  { term: 'th:fragment / th:replace', definition: 'th:fragment names a reusable piece of a template; th:replace="~{todos/base :: navbar}" puts that piece in place of the element.', match: ['th:fragment', 'th:replace'] },
  { term: 'static/', definition: 'Files served as they are. static/ itself is not part of the URL: static/css/style.css is served at /css/style.css.' },
  // Running and testing
  { term: 'curl', definition: 'A command-line HTTP client. It shows exactly what the server sends back, here the finished HTML.' },
  { term: '400 / 405', definition: '400 Bad Request: the request could not be read, like letters where a number belongs. 405 Method Not Allowed: the URL exists, but not for that method.', match: ['400', '405'] },
  { term: '@Test', definition: "Marks a JUnit test method. Maven's surefire plugin runs every test class during mvnw test." },
  { term: '@Mock / @InjectMocks', definition: 'Mockito: @Mock makes a fake; @InjectMocks builds the real class with the fakes passed into its constructor.', match: ['@Mock', '@InjectMocks'] },
  { term: 'when / verify', definition: 'when(...).thenReturn(...) tells a mock what to answer; verify(mock).method(...) checks it was called.', match: ['when(', 'verify('] },
  { term: 'assertThrows', definition: 'Passes only if the code inside throws that exception.' },
  { term: 'JAR', definition: 'mvnw package builds one runnable file with your code, the libraries and Tomcat inside. java -jar runs it anywhere Java is installed.', match: ['.jar'] },
  { term: 'target/', definition: "Maven's output folder: compiled classes, test reports, the JAR. Rebuilt every build; .gitignore keeps it out." },
  // Git
  { term: 'git', definition: 'git init creates a repository, git add stages files, git commit records a snapshot with a message.', match: ['git init', 'git add', 'git commit'] },
  { term: '.gitignore', definition: "Paths git must never commit. Initializr's covers target/ and IDE folders, not your secrets." },
  ...GIT_TERMS,
]

export const springTodo: Project = {
  id: 'spring-todo',
  track: 'spring',
  title: 'Todo App',
  summary: 'A Spring Boot monolith: controller, service, repository, JPA, MySQL and Thymeleaf pages in one application.',
  projectName: 'todoapp',
  folders: {
    '.mvn': 'Maven Wrapper settings: which Maven version mvnw downloads.',
    src: 'All the code and resources. main/ is the app, test/ the tests.',
    'src/main/java': 'Java source code. Folders under it are packages: com/anubhav/todoapp is com.anubhav.todoapp.',
    [JAVA]: 'The root package. @SpringBootApplication scans it, and every package below it, for components.',
    [`${JAVA}/controller`]: 'Handles browser requests and picks the page to render.',
    [`${JAVA}/service`]: 'Business logic, between the controller and the repository.',
    [`${JAVA}/repository`]: 'Database access. Spring Data JPA writes the implementation.',
    [`${JAVA}/model`]: 'Entities: Java classes mapped to tables.',
    [`${JAVA}/dto`]: 'What the forms may send, with its validation rules.',
    [`${JAVA}/exception`]: 'What happens when something goes wrong.',
    [RES]: 'Everything that is not Java: settings, templates and static files.',
    [`${RES}/templates`]: 'Thymeleaf templates. A controller returns "todos/todo-list" and Thymeleaf renders templates/todos/todo-list.html.',
    [`${RES}/templates/todos`]: 'The pages of the todo feature, and the shared base.html.',
    [`${RES}/static`]: 'Files served as they are. static/ is not in the URL: static/css/style.css is /css/style.css.',
    [`${RES}/static/css`]: 'Stylesheets. base.html links style.css on every page.',
    [`${RES}/static/js`]: 'Scripts: small touches on top of the HTML Thymeleaf draws.',
    'src/test/java': 'Tests, in the same packages as the code they test.',
  },
  worlds: [
    { id: 'setup', title: 'Setup Village', subtitle: 'Java, Spring Initializr and a first run', theme: 'village' },
    { id: 'database', title: 'Database Dungeon', subtitle: 'MySQL, the Todo entity and its repository', theme: 'dungeon' },
    { id: 'logic', title: 'Service Forest', subtitle: 'DTO, exceptions, the service and the controller', theme: 'forest' },
    { id: 'templates', title: 'Template Castle', subtitle: 'Thymeleaf pages, CSS and JavaScript', theme: 'castle' },
    { id: 'testing', title: 'Test Lab', subtitle: 'Unit tests with Mockito, then one runnable JAR', theme: 'lab' },
    { id: 'production', title: 'Production City', subtitle: 'Commit it, push it to GitHub, see the whole architecture', theme: 'city' },
  ],
  levels: [
    // ---- World 1: Setup Village ------------------------------------------------------------
    {
      id: 'big-picture',
      world: 'setup',
      kind: 'explore',
      title: 'The big picture',
      summary: 'How a Spring Boot monolith is layered, and the whole cycle of building one.',
      lesson: `This journey builds a monolith: one Spring Boot application handles the browser's requests, runs the logic, stores the data and renders the HTML pages. No React, no separate frontend, one JAR to deploy.

Inside, the code is split into layers, and each one only talks to the layer below it:
- the controller handles HTTP: it receives the request and picks the page to render
- the service holds the business logic
- the repository reaches the database, through JPA and Hibernate
- Thymeleaf templates turn the data into HTML

Open README.md: it maps the whole scenario, from checking Java to pushing to GitHub, and every level that follows is one step of it.`,
      adds: [{ path: 'README.md', about: 'The whole scenario: how the project is created, its layers, the request cycle, how to run it.', content: README }],
      quiz: {
        question: 'A browser asks for /todos. Which layer is the first to handle the request?',
        options: ['The repository', 'The controller', 'The Thymeleaf template'],
        answer: 1,
        explain: 'The controller receives every HTTP request. It asks the service, the service asks the repository, and at the end the controller hands the data to a template.',
      },
    },
    {
      id: 'check-java',
      world: 'setup',
      kind: 'command',
      title: 'Check your Java',
      summary: 'Make sure the JDK is installed: Spring Boot 4 needs Java 17 or newer.',
      lesson: `Spring Boot 4.1 runs on Java 17 or newer; this project uses Java 21, the current long-term-support version.

You need the JDK (Java Development Kit), not just a Java runtime: \`java\` runs programs and \`javac\` compiles them. Check both before anything else. Maven itself does not need installing: the project brings its own wrapper.`,
      cwd: '',
      steps: [
        {
          goal: 'Print the version of java.',
          hint: 'java, then a flag asking for its version.',
          accept: ['java -version', 'java --version'],
          output: 'openjdk version "21.0.8" 2025-07-15 LTS\nOpenJDK Runtime Environment Temurin-21.0.8+9 (build 21.0.8+9-LTS)\nOpenJDK 64-Bit Server VM Temurin-21.0.8+9 (build 21.0.8+9-LTS, mixed mode, sharing)',
          explain: 'Java 21 is installed. Any vendor works: Temurin, Microsoft, Oracle.',
        },
        {
          goal: 'Print the version of the compiler, javac.',
          hint: 'The same flag, on javac.',
          accept: ['javac -version', 'javac --version'],
          output: 'javac 21.0.8',
          explain: 'javac answered too, so this is a full JDK. If it is missing, you installed only a runtime (JRE).',
        },
      ],
    },
    {
      id: 'initializr',
      world: 'setup',
      kind: 'explore',
      title: 'Generate the project',
      summary: 'Spring Initializr writes the skeleton: pom.xml, the Maven Wrapper, the main class.',
      lesson: `In VS Code, press Ctrl+Shift+P and run "Spring Initializr: Create a Maven Project" (it comes with the Spring Boot Extension Pack). Choose:
- Spring Boot 4.1.1, Java, Maven, Jar packaging, Java 21
- group com.anubhav, artifact todoapp, package com.anubhav.todoapp
- dependencies: Spring Web, Thymeleaf, Spring Data JPA, MySQL Driver, Validation

Nothing else yet: no Security, no Lombok, no Docker. You are learning the layers first.

Initializr writes the files you see appear. pom.xml lists the dependencies, mvnw runs Maven, and TodoappApplication.java starts everything. HELP.md is only a list of links, and .gitignore even keeps it out of git, so the explorer shows it locked. Open the other new files, then answer the question.`,
      adds: [
        { path: 'pom.xml', about: 'The Maven project: Spring Boot parent, Java 21 and the five dependencies you picked.', content: POM },
        { path: 'mvnw', about: `The Maven Wrapper for macOS and Linux: ./mvnw. ${WRAPPER_ABOUT}`, content: MVNW, generated: true },
        { path: 'mvnw.cmd', about: `The Maven Wrapper for Windows: .\\mvnw.cmd. ${WRAPPER_ABOUT}`, content: MVNW_CMD, generated: true },
        { path: '.mvn/wrapper/maven-wrapper.properties', about: `Which Maven version the wrapper downloads. ${WRAPPER_ABOUT}`, content: WRAPPER_PROPERTIES, generated: true },
        { path: '.gitignore', about: 'Keeps target/, HELP.md and IDE folders out of git. It knows nothing about your passwords.', content: GITIGNORE },
        { path: '.gitattributes', about: 'Line endings: mvnw keeps Unix ones, .cmd files Windows ones, whoever checks them out.', content: GITATTRIBUTES },
        { path: `${JAVA}/TodoappApplication.java`, about: 'The main class. @SpringBootApplication starts Spring, Tomcat and everything it finds below this package.', content: MAIN_CLASS },
        { path: `${RES}/application.properties`, about: 'Settings: the app name for now. The database settings come later.', content: 'spring.application.name=todoapp\n' },
        { path: `${RES}/static/`, about: 'CSS and JavaScript, served as they are.' },
        { path: `${RES}/templates/`, about: 'Thymeleaf HTML templates.' },
        { path: `${TEST}/TodoappApplicationTests.java`, about: 'A generated test: it passes when the whole application can start.', content: CONTEXT_TEST },
        { path: 'HELP.md', about: "Initializr's list of documentation links. This project never uses it, and .gitignore keeps it out of git.", content: HELP_MD, generated: true, unused: true },
      ],
      quiz: {
        question: 'Which of the five dependencies draws the HTML pages?',
        options: ['Spring Data JPA', 'Thymeleaf', 'MySQL Driver'],
        answer: 1,
        explain: 'Thymeleaf renders the templates into HTML. Spring Data JPA and the MySQL Driver are the database side; Spring Web handles the requests.',
      },
    },
    {
      id: 'first-run',
      world: 'setup',
      kind: 'command',
      title: 'The first run',
      summary: 'Start the empty application and read why it refuses.',
      lesson: `\`.\\mvnw.cmd spring-boot:run\` (or \`./mvnw spring-boot:run\` on macOS and Linux) compiles the project and starts it, with Tomcat built in. The first time, the wrapper also downloads Maven and every library in pom.xml.

Run it now. It will fail, and that is the lesson: you picked Spring Data JPA, so Spring Boot wants a database before it starts, and you have not told it where one is. Reading the error is half of the job.`,
      cwd: '',
      steps: [
        {
          goal: 'Start the application with the Maven Wrapper.',
          hint: 'Windows: .\\mvnw.cmd spring-boot:run. macOS / Linux: ./mvnw spring-boot:run',
          accept: RUN_COMMANDS,
          output: RUN_FAILS,
          adds: [{ path: 'target/', about: TARGET_ABOUT, generated: true }],
          explain: 'APPLICATION FAILED TO START: "Failed to configure a DataSource". JPA needs a database URL. You fix that in the Database Dungeon. Maven already compiled your class into target/.',
        },
      ],
    },
    {
      id: 'packages',
      world: 'setup',
      kind: 'command',
      title: 'Make room for the layers',
      summary: 'Create a package per layer: controller, service, repository, model, dto, exception.',
      lesson: `In Java, packages are folders. The layers each get one, inside the root package com.anubhav.todoapp:
- model: what is the data?
- repository: how do I reach the database?
- service: what business logic should happen?
- controller: how does the browser talk to the app?
- dto: what data do I accept from a form?
- exception: what happens when something goes wrong?

They must sit below com.anubhav.todoapp. @SpringBootApplication only scans its own package and the ones under it, so a controller anywhere else is never found.`,
      cwd: '',
      steps: [
        {
          goal: 'Move into the root package folder, src/main/java/com/anubhav/todoapp.',
          hint: 'cd and the path.',
          accept: ['cd src/main/java/com/anubhav/todoapp', 'cd src\\main\\java\\com\\anubhav\\todoapp', 'cd ./src/main/java/com/anubhav/todoapp'],
          cwd: JAVA,
          explain: 'You are next to TodoappApplication.java now.',
        },
        {
          goal: 'Create the six folders in one command: controller, service, repository, model, dto and exception.',
          hint: 'mkdir takes several names: mkdir controller service repository model dto exception (PowerShell wants commas between them).',
          accept: ['mkdir controller service repository model dto exception', 'mkdir controller, service, repository, model, dto, exception', 'mkdir -p controller service repository model dto exception'],
          adds: ['controller', 'service', 'repository', 'model', 'dto', 'exception'].map((name) => ({ path: `${JAVA}/${name}/`, about: `The ${name} package.` })),
          explain: 'Six empty packages. Each fills up with one layer of the app.',
        },
      ],
    },

    // ---- World 2: Database Dungeon ---------------------------------------------------------
    {
      id: 'create-database',
      world: 'database',
      kind: 'command',
      title: 'Create the database',
      summary: 'Make an empty todo_db database in MySQL.',
      lesson: `MySQL holds many databases; this app gets its own, todo_db. You only create the empty database: the tables come later, generated by Hibernate from your Java classes.

\`mysql -u root -p -e "…"\` logs in as root, asks for your password (it stays hidden), runs the SQL after -e and exits.`,
      cwd: '',
      steps: [
        {
          goal: 'Create a database called todo_db.',
          hint: 'mysql -u root -p -e "CREATE DATABASE todo_db;"',
          accept: ['mysql -u root -p -e "CREATE DATABASE todo_db;"'],
          pattern: 'mysql -u ?root -p -e "(?:CREATE DATABASE|create database) todo_db;?"',
          output: 'Enter password: ********',
          explain: 'No news is good news: the database exists, empty.',
        },
        {
          goal: 'List the databases to check todo_db is there.',
          hint: 'The same command, with SHOW DATABASES;',
          accept: ['mysql -u root -p -e "SHOW DATABASES;"'],
          pattern: 'mysql -u ?root -p -e "(?:SHOW DATABASES|show databases);?"',
          output: 'Enter password: ********\n+--------------------+\n| Database           |\n+--------------------+\n| information_schema |\n| mysql              |\n| performance_schema |\n| sys                |\n| todo_db            |\n+--------------------+',
          explain: 'todo_db is there, next to MySQL\'s own databases.',
        },
      ],
    },
    {
      id: 'configure-db',
      world: 'database',
      kind: 'edit',
      title: 'Point Spring at MySQL',
      summary: 'Fill in the datasource settings, with the password kept out of the file.',
      lesson: `Spring Boot builds the database connection from the \`spring.datasource\` settings in application.properties: the JDBC URL, the user and the password.

The password never goes in this file: the file is committed, and anything committed is public sooner or later. \`\${DB_PASSWORD}\` makes Spring read it from an environment variable instead, which you set in the terminal.

\`spring.jpa.hibernate.ddl-auto=update\` lets Hibernate create the tables from your entities. Fine for learning; real projects use migration tools.`,
      path: `${RES}/application.properties`,
      about: 'Database and JPA settings.',
      starter: PROPERTIES_STARTER,
      solution: PROPERTIES_SOLUTION,
      checks: [
        { id: 'url', name: 'The URL points at todo_db on your MySQL', hint: 'spring.datasource.url=jdbc:mysql://localhost:3306/todo_db', type: 'matches', value: /^\s*spring\.datasource\.url\s*=\s*jdbc:mysql:\/\/(?:localhost|127\.0\.0\.1):3306\/todo_db\s*$/.source, flags: 'm' },
        { id: 'username', name: 'The user is root', hint: 'spring.datasource.username=root', type: 'matches', value: /^\s*spring\.datasource\.username\s*=\s*root\s*$/.source, flags: 'm' },
        { id: 'password', name: 'The password comes from DB_PASSWORD, not from the file', hint: 'spring.datasource.password=${DB_PASSWORD}. Never type your real password here.', type: 'matches', value: /^\s*spring\.datasource\.password\s*=\s*\$\{DB_PASSWORD(?::[^}]*)?\}\s*$/.source, flags: 'm' },
        { id: 'ddl-auto', name: 'Hibernate creates the tables', hint: 'spring.jpa.hibernate.ddl-auto=update', type: 'matches', value: /^\s*spring\.jpa\.hibernate\.ddl-auto\s*=\s*update\s*$/.source, flags: 'm' },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Point spring.datasource.url at the todo_db database on your MySQL.',
          options: [
            { code: 'spring.datasource.url=http://localhost:3306/todo_db', why: 'Java talks to databases over JDBC, not HTTP. Spring finds no driver for an http:// address and refuses to start.' },
            { code: 'spring.datasource.url=jdbc:mysql://localhost:3306/todo_db', why: 'A JDBC URL: the driver (mysql), the server (localhost, on MySQL\'s port 3306) and the database (todo_db).' },
            { code: 'spring.datasource.url=jdbc:mysql://localhost:8080/todo_db', why: "8080 is your own app's port (server.port, at the bottom). MySQL listens on 3306, so the connection is refused." },
          ],
          answer: 1,
          checks: ['url'],
          sources: [
            { name: 'jdbc:mysql://', from: 'file', path: 'pom.xml', find: '<artifactId>mysql-connector-j</artifactId>', note: 'The MySQL Driver you picked in Initializr. It is what understands jdbc:mysql:// addresses.' },
            { name: 'todo_db', from: 'command', note: 'The empty database you made with CREATE DATABASE todo_db in the last level.' },
          ],
          result: 'Spring Boot builds its DataSource from this, so JPA stops failing with "Failed to configure a DataSource".',
        },
        {
          marker: 'TODO 2:',
          goal: 'Log in to MySQL as the root user.',
          options: [
            { code: 'spring.datasource.user=root', why: 'The key is username. Spring ignores keys it does not know, so it logs in with no user and MySQL answers Access denied.' },
            { code: 'spring.datasource.username="root"', why: 'Properties files take values as they are: the quotes become part of the name, and MySQL looks for a user called "root", quotes included.' },
            { code: 'spring.datasource.username=root', why: 'key=value, no quotes. root is MySQL\'s admin user.' },
          ],
          answer: 2,
          checks: ['username'],
          sources: [{ name: 'root', from: 'builtin', note: "MySQL's admin user, made when MySQL was installed." }],
          result: 'Spring logs in as root, with the password from the next line.',
        },
        {
          marker: 'TODO 3:',
          goal: 'Read the password from the DB_PASSWORD environment variable, never from this file.',
          options: [
            { code: 'spring.datasource.password=${DB_PASSWORD}', why: '${…} is a placeholder: Spring fills it in from the environment when the app starts, so the file never holds the secret.' },
            { code: 'spring.datasource.password=DB_PASSWORD', why: 'Without ${…}, the password is literally the text DB_PASSWORD, and MySQL answers Access denied.' },
            { code: 'spring.datasource.password=my-real-password', why: 'It works until you commit. application.properties goes to GitHub, and your password with it.' },
          ],
          answer: 0,
          checks: ['password'],
          sources: [{ name: 'DB_PASSWORD', from: 'command', note: 'You set it in the terminal before running the app, in Run it for real: $env:DB_PASSWORD="…".' }],
          result: 'At startup Spring swaps ${DB_PASSWORD} for the real value; the file stays safe to push.',
        },
        {
          marker: 'TODO 4:',
          goal: 'Let Hibernate create the tables from your entities.',
          options: [
            { code: 'spring.jpa.hibernate.ddl-auto=create-drop', why: 'create-drop deletes every table when the app stops, so each restart starts with an empty database.' },
            { code: 'spring.jpa.hibernate.ddl-auto=none', why: "none means Hibernate never touches the tables, so todos is never created and the first query fails: Table 'todo_db.todos' doesn't exist." },
            { code: 'spring.jpa.hibernate.ddl-auto=update', why: 'update creates missing tables and columns, and keeps your data between runs.' },
          ],
          answer: 2,
          checks: ['ddl-auto'],
          sources: [{ name: 'Hibernate', from: 'file', path: 'pom.xml', find: '<artifactId>spring-boot-starter-data-jpa</artifactId>', note: 'Spring Data JPA, from pom.xml, brings Hibernate along.' }],
          result: 'On the next run Hibernate reads every @Entity and creates its table. The Todo entity comes next.',
        },
      ],
    },
    {
      id: 'todo-entity',
      world: 'database',
      kind: 'bugfix',
      boss: true,
      title: 'Bug hunt: the Todo entity',
      summary: 'Copied from an old tutorial: two bugs stop the build, two wait for the first save.',
      lesson: `An entity is a Java class that JPA maps to a table: \`@Entity\` marks it, each field becomes a column, and \`@Id\` marks the primary key.

A teammate copied this one from an old tutorial. It has four bugs:
- the build fails with "package javax.persistence does not exist"
- startup fails with "Not a managed type: class com.anubhav.todoapp.model.Todo"
- saving a new todo fails: Hibernate says the id "must be manually assigned"
- Hibernate refuses to load rows into the class

Fix them all.`,
      path: `${JAVA}/model/Todo.java`,
      about: 'The Todo entity: one row of the todos table.',
      starter: ENTITY_BUGGY,
      solution: ENTITY_SOLUTION,
      checks: [
        { id: 'jakarta', name: 'Uses the Jakarta Persistence API', hint: 'Since Spring Boot 3, JPA lives in jakarta.persistence. javax.persistence is from older tutorials: import jakarta.persistence.*;', type: 'matches', value: /^(?![\s\S]*import\s+javax\.persistence)[\s\S]*import\s+jakarta\.persistence\./.source },
        { id: 'entity', name: 'Todo is an entity', hint: 'Without @Entity, JPA ignores the class and the repository cannot start. Put @Entity above the class.', type: 'matches', value: /@Entity\b[\s\S]*?\bclass\s+Todo\b/.source },
        { id: 'generated-id', name: 'MySQL numbers the new rows', hint: '@GeneratedValue(strategy = GenerationType.IDENTITY) under @Id lets MySQL fill in the id (AUTO_INCREMENT).', type: 'matches', value: /@GeneratedValue\(\s*strategy\s*=\s*GenerationType\.IDENTITY\s*\)/.source },
        { id: 'no-arg', name: 'JPA can create empty Todo objects', hint: 'JPA builds an empty object and then fills in its fields, so an entity needs a no-argument constructor: public Todo() { }', type: 'matches', value: /(?:public|protected)\s+Todo\(\s*\)\s*\{/.source },
      ],
    },
    {
      id: 'repository',
      world: 'database',
      kind: 'edit',
      title: 'The repository',
      summary: 'One interface, and Spring Data JPA writes the database code.',
      lesson: `A repository is the layer that reaches the database. With Spring Data JPA it is just an interface: extend \`JpaRepository<Todo, Long>\` (the entity, and the type of its id) and Spring writes the class at startup.

You get findAll(), findById(), save(), deleteById(), existsById(), count() and more, without writing any SQL.`,
      path: `${JAVA}/repository/TodoRepository.java`,
      about: 'Database access for todos. Spring Data JPA writes the implementation.',
      starter: REPOSITORY_STARTER,
      solution: REPOSITORY_SOLUTION,
      checks: [
        { id: 'extends', name: 'TodoRepository is a JpaRepository for Todo with Long ids', hint: 'public interface TodoRepository extends JpaRepository<Todo, Long>', type: 'matches', value: /interface\s+TodoRepository\s+extends\s+JpaRepository\s*<\s*Todo\s*,\s*Long\s*>/.source },
        { id: 'interface', name: 'It stays an interface', hint: 'Spring writes the class for you. Keep it an interface, with no class of your own.', type: 'notMatches', value: /\bclass\s+TodoRepository\b/.source },
      ],
      gaps: [
        {
          marker: 'TODO: extend JpaRepository',
          span: 2,
          goal: 'Make TodoRepository a JpaRepository for Todo entities with Long ids.',
          options: [
            { code: 'public interface TodoRepository extends JpaRepository<Long, Todo> {', why: 'Order matters: the entity first, then the id type. This one says the entity is Long, and startup fails: Not a managed type: class java.lang.Long.' },
            { code: 'public interface TodoRepository extends JpaRepository<Todo, Long> {', why: 'What it stores (Todo), then the type of its id (Long, like the @Id field). Spring writes the class for you.' },
            { code: 'public class TodoRepository implements JpaRepository<Todo, Long> {', why: 'A class would have to write every method of JpaRepository itself, dozens of them. Keep it an interface: Spring writes the class at startup.' },
          ],
          answer: 1,
          checks: ['extends'],
          sources: [
            { name: 'JpaRepository', from: 'import', find: 'import org.springframework.data.jpa.repository.JpaRepository', note: 'From Spring Data JPA, imported at the top.' },
            { name: 'Todo', from: 'file', path: `${JAVA}/model/Todo.java`, find: 'public class Todo', note: 'The entity you fixed in the last level, imported at the top.' },
            { name: 'Long', from: 'file', path: `${JAVA}/model/Todo.java`, find: 'private Long id', note: "The type of Todo's @Id field." },
          ],
          result: 'TodoService will call findAll(), findById() and save() on it: all written by Spring.',
        },
      ],
    },
    {
      id: 'run-app',
      world: 'database',
      kind: 'command',
      title: 'Run it for real',
      summary: 'Hand over the password, start the app, and watch Hibernate create the table.',
      lesson: `Everything the database side needs is in place: the database, the settings, an entity and a repository. Two things remain.

Set DB_PASSWORD in the terminal, so application.properties can read it. It lasts as long as this terminal does and never touches a file.

Then start the app. With ddl-auto=update, Hibernate compares your entity with the database and creates the missing table.`,
      cwd: '',
      steps: [
        {
          goal: 'Put your MySQL password in an environment variable called DB_PASSWORD.',
          hint: 'PowerShell: $env:DB_PASSWORD="your-password". macOS / Linux: export DB_PASSWORD=your-password',
          accept: ['$env:DB_PASSWORD="your-password"'],
          pattern: '(?:\\$env:DB_PASSWORD ?= ?"[^"]+"|export DB_PASSWORD="?[^"\\s]+"?|set DB_PASSWORD=\\S+)',
          explain: 'Nothing is printed. The password lives only in this terminal, and application.properties reads it as ${DB_PASSWORD}.',
        },
        {
          goal: 'Start the application.',
          hint: 'The same command as the first run.',
          accept: RUN_COMMANDS,
          output: RUN_STARTS(3, true),
          explain: 'Started. Hibernate read your @Entity and created the todos table. http://localhost:8080/todos still answers 404: there is no controller yet.',
        },
        {
          goal: 'Ask MySQL to describe the new table, todo_db.todos.',
          hint: 'mysql -u root -p -e "DESCRIBE todo_db.todos;"',
          accept: ['mysql -u root -p -e "DESCRIBE todo_db.todos;"'],
          pattern: 'mysql -u ?root -p -e "(?:DESCRIBE|describe|DESC|desc) todo_db\\.todos;?"',
          output: DESCRIBE_TABLE,
          explain: 'Your Java fields, as columns: Long became bigint with auto_increment, the title a varchar(200) that cannot be null.',
        },
      ],
    },

    // ---- World 3: Service Forest -----------------------------------------------------------
    {
      id: 'dto',
      world: 'logic',
      kind: 'edit',
      title: 'What the form may send',
      summary: 'A DTO with validation rules, so the entity never meets raw form data.',
      lesson: `The Add Todo form could bind straight to the Todo entity, but then anyone who edits the HTML could send an id or completed=true too. A DTO (Data Transfer Object) holds exactly what the form may send: here, only the title.

It is also where the rules live. With the Validation dependency, annotations on the fields describe valid data, and \`@Valid\` in the controller checks them:
- \`@NotBlank\` rejects a missing, empty or spaces-only title
- \`@Size(max = 200)\` matches the 200 characters of the column

Each takes a message, shown next to the field when the rule fails.`,
      path: `${JAVA}/dto/TodoRequest.java`,
      about: 'What the Add Todo form may send, with its validation rules.',
      starter: DTO_STARTER,
      solution: DTO_SOLUTION,
      checks: [
        { id: 'not-blank', name: 'A blank title is rejected', hint: '@NotBlank(message = "Title cannot be empty") above private String title;', type: 'matches', value: /@NotBlank\b[^;]*private\s+String\s+title/.source },
        { id: 'size', name: 'The title has at most 200 characters', hint: '@Size(max = 200, message = "Title cannot exceed 200 characters")', type: 'matches', value: /@Size\([^)]*\bmax\s*=\s*200\b[^;]*private\s+String\s+title/.source },
        { id: 'message', name: 'The user is told what is wrong', hint: 'Give @NotBlank the message "Title cannot be empty".', type: 'includes', value: 'message = "Title cannot be empty"' },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Reject a missing or blank title, with the message "Title cannot be empty".',
          options: [
            { code: '@NotNull(message = "Title cannot be empty")', why: '@NotNull only rejects a missing title. An empty or spaces-only one still passes, and NotNull is not even imported here.' },
            { code: '@NotBlank(message = "Title cannot be empty")', why: '@NotBlank rejects null, empty and spaces-only text, and message is what the form shows.' },
            { code: '@NotBlank', why: 'It rejects a blank title, but the form shows the default text, "must not be blank", instead of your message.' },
          ],
          answer: 1,
          checks: ['not-blank', 'message'],
          sources: [
            { name: 'NotBlank', from: 'import', find: 'import jakarta.validation.constraints.NotBlank', note: 'From the Validation dependency you picked in Initializr.' },
            { name: 'title', from: 'here', find: 'private String title', note: 'The field the rule guards: an annotation applies to the declaration right after it.' },
          ],
          result: '@Valid in the controller runs this rule. When it fails, the BindingResult carries your message to the form.',
        },
        {
          marker: 'TODO 2:',
          goal: 'Allow at most 200 characters, with the message "Title cannot exceed 200 characters".',
          options: [
            { code: '@Size(min = 200, message = "Title cannot exceed 200 characters")', why: 'min sets the shortest allowed title, so every title under 200 characters would be rejected.' },
            { code: '@Max(value = 200, message = "Title cannot exceed 200 characters")', why: "@Max is for numbers, like a quantity. A String's length needs @Size." },
            { code: '@Size(max = 200, message = "Title cannot exceed 200 characters")', why: 'max = 200 caps the length, the same 200 as the column.' },
          ],
          answer: 2,
          checks: ['size'],
          sources: [
            { name: 'Size', from: 'import', find: 'import jakarta.validation.constraints.Size', note: 'From the Validation dependency too.' },
            { name: '200', from: 'file', path: `${JAVA}/model/Todo.java`, find: 'length = 200', note: "The entity's title column holds 200 characters, so the form allows no more." },
          ],
          result: 'A 300-character title comes back with your message, instead of failing later in MySQL.',
        },
      ],
    },
    {
      id: 'exceptions',
      world: 'logic',
      kind: 'explore',
      title: 'When something goes wrong',
      summary: 'A "not found" exception, and one handler for every controller.',
      lesson: `What should happen when someone toggles a todo that was just deleted? The service cannot find it. Returning null would push the problem along until something crashes with a NullPointerException, far from the cause.

Instead the service throws \`ResourceNotFoundException\`, which says exactly what went wrong. \`GlobalExceptionHandler\` catches it for every controller, thanks to \`@ControllerAdvice\`, and sends the browser back to the list with the message as a flash attribute: a value that survives exactly one redirect.

Open both files, then answer the question.`,
      adds: [
        { path: `${JAVA}/exception/ResourceNotFoundException.java`, about: 'Thrown when a todo id does not exist.', content: NOT_FOUND_EXCEPTION },
        { path: `${JAVA}/exception/GlobalExceptionHandler.java`, about: 'Turns a ResourceNotFoundException into a message on the list page.', content: EXCEPTION_HANDLER },
      ],
      quiz: {
        question: 'Someone deletes todo 7, which another tab already deleted. What do they see?',
        options: ['A 500 error page', 'The list again, with "Todo 7 not found"', 'Nothing: the request is ignored'],
        answer: 1,
        explain: 'The service throws ResourceNotFoundException("Todo 7 not found"), GlobalExceptionHandler catches it, stores the message as a flash attribute and redirects to /todos, where the list page shows it.',
      },
    },
    {
      id: 'service-read',
      world: 'logic',
      kind: 'edit',
      title: 'Define the service and list todos',
      summary: 'Annotate with @Service, inject the repository, and write getAllTodos.',
      lesson: `The service is the business logic between the controller and the repository. The controller never touches the repository directly, so business rules live in one clean place.

Start \`TodoService.java\` from scratch:
- Annotate the class with \`@Service\` so Spring registers it as a managed singleton bean.
- Inject \`TodoRepository\` through the constructor (constructor injection).
- Implement \`getAllTodos()\`: ask the repository for all todos, sorted newest first (\`Sort.by(Sort.Direction.DESC, "id")\`).`,
      path: `${JAVA}/service/TodoService.java`,
      about: 'The business logic: list, create, toggle and delete todos.',
      starter: SERVICE_READ_STARTER,
      solution: SERVICE_READ_SOLUTION,
      checks: [
        { id: 'service-anno', name: 'Annotated with @Service', hint: '@Service above the class declaration.', type: 'includes', value: '@Service\npublic class TodoService' },
        { id: 'constructor-inj', name: 'Constructor injects TodoRepository', hint: 'public TodoService(TodoRepository todoRepository) { this.todoRepository = todoRepository; }', type: 'includes', value: 'public TodoService(TodoRepository todoRepository) {\n        this.todoRepository = todoRepository;\n    }' },
        { id: 'get-all', name: 'getAllTodos queries repository sorted by id DESC', hint: 'return todoRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));', type: 'includes', value: 'return todoRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));' },
      ],
      gaps: [
        {
          marker: '// TODO 1:',
          goal: 'Annotate class with @Service so Spring registers it as a service bean.',
          options: [
            { code: '@Service\npublic class TodoService {', why: 'Tells Spring this class holds business logic and should be managed as a singleton component.' },
            { code: '@Component\npublic class TodoService {', why: '@Component works, but @Service is the specialized stereotype for business logic layer classes.' },
            { code: 'public class TodoService {', why: 'Without @Service, Spring cannot detect or inject this class into the controller.' },
          ],
          answer: 0,
          checks: ['service-anno'],
          sources: [{ name: 'Service', from: 'import', find: 'import org.springframework.stereotype.Service;', note: 'Spring stereotype annotation for service layer.' }],
          result: 'Spring will create and inject TodoService at startup.',
        },
        {
          marker: '// TODO 2:',
          goal: 'Inject TodoRepository through the constructor.',
          options: [
            { code: 'public TodoService(TodoRepository todoRepository) {\n        this.todoRepository = todoRepository;\n    }', why: 'Constructor injection ensures the repository dependency is passed in when Spring creates the service.' },
            { code: 'public TodoService() {\n        this.todoRepository = null;\n    }', why: 'Leaves todoRepository as null, causing NullPointerException on any database call.' },
            { code: 'public TodoService(TodoRepository repo) {\n    }', why: 'Does not assign the parameter to this.todoRepository, leaving the field null.' },
          ],
          answer: 0,
          checks: ['constructor-inj'],
          sources: [{ name: 'TodoRepository', from: 'import', find: 'import com.anubhav.todoapp.repository.TodoRepository;', note: 'The repository interface from the data layer.' }],
          result: 'todoRepository is initialized and ready to run queries.',
        },
        {
          marker: '// TODO 3:',
          goal: 'Return all todos sorted by id descending.',
          options: [
            { code: 'return todoRepository.findAll(Sort.by(Sort.Direction.DESC, "id"));', why: 'Calls Spring Data JPA findAll with sorting so newest todos appear first.' },
            { code: 'return todoRepository.findAll();', why: 'Returns todos in natural database order (oldest first). We need newest first (DESC by id).' },
            { code: 'return todoRepository.findById(1L);', why: 'findById returns one Optional, not the List<Todo> required by the return type.' },
          ],
          answer: 0,
          checks: ['get-all'],
          sources: [{ name: 'todoRepository', from: 'here', find: 'private final TodoRepository todoRepository;', note: 'The injected repository field.' }],
          result: 'getAllTodos returns all todos sorted newest first.',
        },
      ],
    },
    {
      id: 'service',
      world: 'logic',
      kind: 'build',
      title: 'Build getTodoById and createTodo',
      summary: 'Find a todo or fail clearly, and save new todos with trimmed titles.',
      lesson: `Now add lookup and creation to \`TodoService.java\`:

- \`getTodoById\` must return the todo or throw \`ResourceNotFoundException\`: \`findById\` returns an \`Optional\`, a container that may be empty, and \`orElseThrow\` extracts it or throws with a helpful message.
- \`createTodo\` trims the title and calls \`todoRepository.save(new Todo(title, false))\`.

Some blocks look right but hide a bug: hover one to read what it does.`,
      path: `${JAVA}/service/TodoService.java`,
      about: 'The business logic: list, create, toggle and delete todos.',
      scaffold: [...lines(SERVICE_CREATE_HEAD), slot(1, 8), line('    }'), line(''), line('    public Todo createTodo(TodoRequest request) {'), slot(2, 8), line('    }'), line('}')],
      blocks: [
        { id: 'find', label: 'Find it, or fail with "not found"', code: 'return todoRepository.findById(id)\n        .orElseThrow(() -> new ResourceNotFoundException("Todo " + id + " not found"));', what: 'findById returns an Optional. orElseThrow hands back the todo, or throws with a message that names the missing id.', whyHere: 'The one place that decides what a missing todo means. Toggle and delete reuse it.' },
        { id: 'create', label: 'Save the new todo', code: 'return todoRepository.save(new Todo(request.getTitle().trim(), false));', what: 'Trims leading/trailing whitespace and saves a new non-completed Todo row.', whyHere: 'Ensures clean data reaches MySQL and returns the persisted entity with its generated id.' },
        { id: 'bad-find-null', label: 'Find it, or return nothing', code: 'return todoRepository.findById(id).orElse(null);', what: 'Returns the todo, or null.', whyWrong: 'Every caller now has to check for null, and the first one that forgets crashes with a NullPointerException, far from the cause.' },
        { id: 'bad-find-get', label: 'Find it', code: 'return todoRepository.findById(id).get();', what: 'Opens the Optional.', whyWrong: 'get() on an empty Optional throws NoSuchElementException, which the user sees as a 500 error, with no hint of which todo was missing.' },
        { id: 'bad-create-untrimmed', label: 'Save the raw title', code: 'return todoRepository.save(new Todo(request.getTitle(), false));', what: 'Saves without trimming.', whyWrong: 'Leaves accidental leading and trailing whitespace in the database title.' },
      ],
      steps: [
        { kind: 'Lookup', goal: 'Return the todo, or fail with a clear "not found".' },
        { kind: 'Database write', goal: 'Save the new todo with a trimmed title and completed=false.' },
      ],
    },
    {
      id: 'service-update-delete',
      world: 'logic',
      kind: 'edit',
      title: 'Build toggleTodo and deleteTodo',
      summary: 'Reuse getTodoById to update or delete rows safely.',
      lesson: `Complete \`TodoService.java\` with toggle and delete:

- \`toggleTodo\` reuses \`getTodoById(id)\` to safely look up the row, flips \`completed\` with \`setCompleted(!todo.isCompleted())\`, and saves it. Because the entity already has an ID, \`save()\` issues an SQL \`UPDATE\`.
- \`deleteTodo\` looks up the entity with \`getTodoById(id)\` and passes it to \`todoRepository.delete(todo)\`. If the ID does not exist, \`getTodoById\` immediately throws \`ResourceNotFoundException\`.`,
      path: `${JAVA}/service/TodoService.java`,
      about: 'The business logic: list, create, toggle and delete todos.',
      starter: SERVICE_UPDATE_DELETE_STARTER,
      solution: SERVICE,
      checks: [
        { id: 'toggle', name: 'toggleTodo flips completed and saves', hint: 'Todo todo = getTodoById(id); todo.setCompleted(!todo.isCompleted()); todoRepository.save(todo);', type: 'includes', value: 'Todo todo = getTodoById(id);\n        todo.setCompleted(!todo.isCompleted());\n        todoRepository.save(todo);' },
        { id: 'delete', name: 'deleteTodo deletes the todo by entity', hint: 'todoRepository.delete(getTodoById(id));', type: 'includes', value: 'todoRepository.delete(getTodoById(id));' },
      ],
      gaps: [
        {
          marker: '// TODO 1:',
          goal: 'Load todo with getTodoById, flip completed, and save it.',
          options: [
            { code: 'Todo todo = getTodoById(id);\n        todo.setCompleted(!todo.isCompleted());\n        todoRepository.save(todo);', why: 'Reuses getTodoById (which checks 404), toggles boolean, and calls save() to perform SQL UPDATE.' },
            { code: 'Todo todo = getTodoById(id);\n        todo.setCompleted(true);\n        todoRepository.save(todo);', why: 'Hardcodes true: pressing the toggle button can never undo completion.' },
            { code: 'Todo todo = getTodoById(id);\n        todo.setCompleted(!todo.isCompleted());', why: 'Missing todoRepository.save(todo): the change is only in Java heap memory and never saved to the database.' },
          ],
          answer: 0,
          checks: ['toggle'],
          sources: [
            { name: 'getTodoById', from: 'here', find: 'public Todo getTodoById(Long id)', note: 'Reuses lookup and 404 check.' },
            { name: 'todoRepository', from: 'here', find: 'private final TodoRepository todoRepository;', note: 'Injected repository.' },
          ],
          result: 'Toggles completed state and persists the change to MySQL.'
        },
        {
          marker: '// TODO 2:',
          goal: 'Delete the todo using getTodoById(id).',
          options: [
            { code: 'todoRepository.delete(getTodoById(id));', why: 'Loads the entity with getTodoById (raising ResourceNotFoundException if missing) and deletes it via repository.' },
            { code: 'todoRepository.deleteById(id);', why: 'deleteById does not throw ResourceNotFoundException when the id is missing.' },
            { code: 'getTodoById(id);', why: 'Only looks up the entity without calling todoRepository.delete().' },
          ],
          answer: 0,
          checks: ['delete'],
          sources: [
            { name: 'getTodoById', from: 'here', find: 'public Todo getTodoById(Long id)', note: 'Reuses lookup and 404 verification.' },
            { name: 'todoRepository', from: 'here', find: 'private final TodoRepository todoRepository;', note: 'Injected repository.' },
          ],
          result: 'Deletes the specified row from the MySQL database.'
        },
      ],
    },
    {
      id: 'controller',
      world: 'logic',
      kind: 'edit',
      title: 'Write the controller',
      summary: 'Hand the todos to the page, check the form, redirect after saving.',
      lesson: `The controller handles the browser's requests. In a monolith, its methods return the name of a template, not data: \`return "todos/todo-list"\` means "render templates/todos/todo-list.html". A name starting with \`redirect:\` sends the browser to another URL instead.

\`Model\` is how data reaches the template: \`model.addAttribute("todos", …)\` makes \`\${todos}\` available there.

For the form, \`@Valid\` checks the TodoRequest and the \`BindingResult\` right after it collects the errors. When there are errors, show the form again; it now carries the messages. When there are none, save and redirect: Post/Redirect/Get, so refreshing the list never submits the form twice.`,
      path: `${JAVA}/controller/TodoController.java`,
      about: "Handles the browser's requests and picks the page to render.",
      starter: CONTROLLER_STARTER,
      solution: CONTROLLER,
      checks: [
        { id: 'model', name: 'GET /todos hands the todos to the template', hint: 'model.addAttribute("todos", todoService.getAllTodos());', type: 'includes', value: 'model.addAttribute("todos", todoService.getAllTodos())' },
        { id: 'errors', name: 'An invalid form is shown again', hint: 'if (result.hasErrors()) { return "todos/todo-form"; } before saving.', type: 'matches', value: /if\s*\(\s*result\.hasErrors\(\)\s*\)\s*\{?\s*return\s+"todos\/todo-form"\s*;/.source },
        { id: 'redirect', name: 'A saved todo redirects to the list', hint: 'After todoService.createTodo(request); return "redirect:/todos";', type: 'matches', value: /todoService\.createTodo\(\s*\w+\s*\)\s*;\s*return\s+"redirect:\/todos"\s*;/.source },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Hand the todos to the template, under the name "todos".',
          options: [
            { code: 'return todoService.getAllTodos();', why: 'listTodos returns a String: the name of the template. Returning the list does not compile: incompatible types.' },
            { code: 'model.addAttribute("todos", todoService.getAllTodos());', why: 'Model is the bag of data the template receives. Under the name "todos", the list is ${todos} in todo-list.html.' },
            { code: 'model.addAttribute("todo", todoService.getAllTodos());', why: 'The template loops over ${todos}. Under the name todo, the list page finds nothing and shows no todos.' },
          ],
          answer: 1,
          checks: ['model'],
          sources: [
            { name: 'model', from: 'param', find: 'public String listTodos(Model model)', note: 'Spring MVC hands in an empty Model every time it calls this method.' },
            { name: 'todoService', from: 'here', find: 'private final TodoService todoService', note: 'The service, handed to the constructor below it (constructor injection).' },
            { name: 'getAllTodos', from: 'file', path: `${JAVA}/service/TodoService.java`, find: 'public List<Todo> getAllTodos()', note: 'The method in TodoService: it returns the todos, newest first.' },
          ],
          result: 'Thymeleaf renders templates/todos/todo-list.html, where th:each="todo : ${todos}" loops over this list.',
        },
        {
          marker: 'TODO 2:',
          goal: 'When validation failed, show the form again.',
          options: [
            { code: 'if (result.hasErrors()) {\n    return "redirect:/todos/new";\n}', why: 'A redirect starts a fresh request: the errors and what the user typed are lost, and the form comes back empty, with no message.' },
            { code: 'if (request.hasErrors()) {\n    return "todos/todo-form";\n}', why: 'request is the TodoRequest: it has a title, not errors. The errors are in result, the BindingResult. This does not compile.' },
            { code: 'if (result.hasErrors()) {\n    return "todos/todo-form";\n}', why: 'Return early with the form\'s template name. The BindingResult goes with it, so the page can show the messages.' },
          ],
          answer: 2,
          checks: ['errors'],
          sources: [
            { name: 'result', from: 'param', find: 'BindingResult result', note: 'Spring hands it in right after the @Valid parameter. It holds every rule that failed.' },
            { name: 'todos/todo-form', from: 'file', note: 'The form page, templates/todos/todo-form.html. You meet it in Template Castle.' },
          ],
          result: 'The user sees the form again, with what they typed and "Title cannot be empty" under the input.',
        },
        {
          marker: 'TODO 3:',
          span: 2,
          goal: 'After saving, redirect the browser to /todos.',
          options: [
            { code: 'return "redirect:/todos";', why: 'redirect: makes Spring answer 302, and the browser loads GET /todos itself. A refresh repeats that GET, not the POST.' },
            { code: 'return "todos/todo-list";', why: 'Rendering here leaves the browser on the POST: a refresh submits the form again and saves a duplicate. And the model has no todos in it.' },
            { code: 'return "redirect:todos/todo-list";', why: 'redirect: takes a URL, not a template name. The browser is sent to a page that has no handler.' },
          ],
          answer: 0,
          checks: ['redirect'],
          sources: [
            { name: 'redirect:', from: 'builtin', note: 'Spring MVC reads a view name that starts with redirect: as "send the browser to this URL".' },
            { name: 'listTodos', from: 'here', find: 'public String listTodos', note: 'The method that answers GET /todos: where the browser lands next.' },
          ],
          result: 'The browser follows the 302 to GET /todos, and listTodos shows the list with the new todo on top.',
        },
      ],
    },
    {
      id: 'controller-bug-hunt',
      world: 'logic',
      kind: 'bugfix',
      boss: true,
      title: 'Bug hunt: the controller',
      summary: 'Someone "simplified" TodoController. Four tests fail. Fix them.',
      lesson: `A teammate "simplified" the controller on Friday evening. Now:
- /todos shows the words todos/todo-list instead of the page
- an empty title gives a 400 error page instead of the form with its message
- pressing Complete answers 500: "Required URI template variable 'todoId' … is not present"
- pressing Delete answers 405, and a plain link to /todos/delete/3 deletes todo 3

Four bugs. The list itself still works: keep it that way.`,
      path: `${JAVA}/controller/TodoController.java`,
      about: "Handles the browser's requests and picks the page to render.",
      starter: CONTROLLER_BUGGY,
      solution: CONTROLLER,
      checks: [
        { id: 'controller', name: 'TodoController renders pages, not text', hint: '@RestController writes the return value straight into the response, so the browser shows "todos/todo-list". @Controller treats it as a template name.', type: 'matches', value: /^(?![\s\S]*@RestController)[\s\S]*@Controller\b/.source },
        { id: 'list', name: 'GET /todos still hands the todos to the template', hint: 'listTodos was fine: model.addAttribute("todos", todoService.getAllTodos());', type: 'includes', value: 'model.addAttribute("todos", todoService.getAllTodos())' },
        {
          id: 'binding-result',
          name: 'An invalid form comes back with its errors',
          hint: 'Without a BindingResult right after the @Valid parameter, a blank title throws and the user gets a 400 page. Add BindingResult result, and return "todos/todo-form" when result.hasErrors().',
          type: 'matches',
          value: /@Valid\s+@ModelAttribute\(\s*"todo"\s*\)\s+TodoRequest\s+\w+\s*,\s*BindingResult\s+\w+\s*\)[\s\S]*?\.hasErrors\(\)/.source,
        },
        { id: 'path-variable', name: 'Toggle reads the id from the URL', hint: '@PathVariable takes its name from the parameter. The URL has {id} and the parameter is todoId, so Spring finds nothing. Name it id, or write @PathVariable("id").', type: 'matches', value: /toggleTodo\(\s*@PathVariable(?:\(\s*"id"\s*\)\s+Long\s+\w+|\s+Long\s+id)\s*\)/.source },
        { id: 'delete-post', name: 'Deleting only happens on a POST', hint: 'A GET can be triggered by a link, a prefetching browser or a crawler, and the form posts anyway. Use @PostMapping("/delete/{id}").', type: 'matches', value: /@PostMapping\(\s*"\/delete\/\{id\}"\s*\)/.source },
      ],
    },

    // ---- World 4: Template Castle ----------------------------------------------------------
    {
      id: 'template-folders',
      world: 'templates',
      kind: 'command',
      title: 'Folders for pages and assets',
      summary: 'Make templates/todos, static/css and static/js.',
      lesson: `The controller returns template names; now the templates themselves. Initializr already made the two folders Spring Boot looks in:
- templates/: Thymeleaf HTML. The name "todos/todo-list" means templates/todos/todo-list.html.
- static/: files served as they are. static/ is not part of the URL: static/css/style.css is served at /css/style.css.

Give each one the folders this app needs.`,
      cwd: '',
      steps: [
        {
          goal: 'Move into src/main/resources.',
          hint: 'cd and the path.',
          accept: ['cd src/main/resources', 'cd src\\main\\resources', 'cd ./src/main/resources'],
          cwd: RES,
        },
        {
          goal: 'Create templates/todos, static/css and static/js in one command.',
          hint: 'mkdir templates/todos static/css static/js (PowerShell wants commas between them).',
          accept: ['mkdir templates/todos static/css static/js', 'mkdir -p templates/todos static/css static/js', 'mkdir templates/todos, static/css, static/js', 'mkdir templates\\todos, static\\css, static\\js'],
          adds: [
            { path: `${RES}/templates/todos/`, about: 'The pages of the todo feature.' },
            { path: `${RES}/static/css/`, about: 'Stylesheets.' },
            { path: `${RES}/static/js/`, about: 'Scripts.' },
          ],
          explain: 'One folder for the pages, one for stylesheets, one for scripts.',
        },
      ],
    },
    {
      id: 'base-template',
      world: 'templates',
      kind: 'edit',
      title: 'The shared pieces',
      summary: 'One base.html with the head, the navbar and the script, reused by every page.',
      lesson: `Every page needs the same <head>, navbar and script. Instead of copying them, base.html defines them once as fragments, and each page pulls them in:
- \`th:fragment="head(title)"\` names a piece, here one that takes a parameter
- a page writes \`<head th:replace="~{todos/base :: head('My Todos')}">\` and gets the whole <head>, with its own title

Links go through \`@{...}\`: \`th:href="@{/css/style.css}"\` builds the URL, with the app's context path in front if it ever has one. The script fragment at the bottom is done: follow it.`,
      path: `${RES}/templates/todos/base.html`,
      about: 'Shared fragments: the <head>, the navbar and the script.',
      starter: BASE_STARTER,
      solution: BASE_SOLUTION,
      checks: [
        { id: 'head-fragment', name: '<head> is a fragment named head, taking a title', hint: '<head th:fragment="head(title)">', type: 'matches', value: /<head\b[^>]*th:fragment=["']head\(\s*title\s*\)["']/.source },
        {
          id: 'stylesheet',
          name: 'style.css is linked through @{...}',
          hint: '<link rel="stylesheet" th:href="@{/css/style.css}"> inside <head>. static/ is not part of the URL.',
          type: 'matches',
          value: /<link(?=[^>]*rel=["']stylesheet["'])(?=[^>]*th:href=["']@\{\/css\/style\.css\}["'])[^>]*>/.source,
        },
        { id: 'navbar', name: 'The header is a fragment named navbar', hint: '<header class="navbar" th:fragment="navbar">', type: 'matches', value: /<header\b[^>]*th:fragment=["']navbar["']/.source },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          span: 2,
          goal: 'Make this <head> a fragment named head, taking one parameter: title.',
          options: [
            { code: '<head th:fragment="head">', why: "The pages call head('My Todos') with a title, and Thymeleaf fails: the fragment declares no parameters." },
            { code: '<head th:fragment="head(title)">', why: "Names the piece and its parameter. A page calls ~{todos/base :: head('My Todos')}, and ${title} becomes My Todos." },
            { code: '<head th:replace="head(title)">', why: 'th:replace pulls a fragment in; it does not define one. This <head> would try to replace itself.' },
          ],
          answer: 1,
          checks: ['head-fragment'],
          sources: [
            { name: 'title', from: 'here', find: '<title th:text="${title}">', note: 'The <title> already prints ${title}: the parameter fills it.' },
            { name: 'th:', from: 'here', find: 'xmlns:th="http://www.thymeleaf.org"', note: 'This line declares the th: attributes, so editors know them. Thymeleaf reads them on the server.' },
          ],
          result: "Each page's <head th:replace=\"~{todos/base :: head('My Todos')}\"> is swapped for this whole <head>, with its own title.",
        },
        {
          marker: 'TODO 2:',
          goal: 'Link the stylesheet in static/css with th:href and a @{...} link.',
          options: [
            { code: '<link rel="stylesheet" th:href="@{/static/css/style.css}">', why: 'static/ is where the file sits, not part of its URL. Spring serves static/css/style.css at /css/style.css, so this answers 404.' },
            { code: '<link rel="stylesheet" th:href="@{/css/style.css}">', why: 'th:href makes Thymeleaf build the link, and /css/style.css is the URL Spring serves the file at.' },
            { code: '<link rel="stylesheet" href="@{/css/style.css}">', why: 'Without th:, the browser gets the text @{/css/style.css} as it is and asks the server for a URL with braces in it.' },
          ],
          answer: 1,
          checks: ['stylesheet'],
          sources: [
            { name: '@{…}', from: 'here', find: 'th:src="@{/js/script.js}"', note: 'The script at the bottom is linked the same way: follow it.' },
            { name: 'style.css', from: 'file', note: 'The stylesheet you meet in the next level. It lives in static/css/.' },
          ],
          result: 'Thymeleaf writes href="/css/style.css" into every page that uses this head.',
        },
        {
          marker: 'TODO 3:',
          span: 2,
          goal: 'Make this header a fragment named navbar.',
          options: [
            { code: '<header class="navbar" id="navbar">', why: 'An id is for CSS and JavaScript. Thymeleaf only pulls in pieces that th:fragment names.' },
            { code: '<header class="navbar" th:fragment="header">', why: 'The pages ask for ~{todos/base :: navbar}. A fragment named header matches nothing, so Thymeleaf fails to find it.' },
            { code: '<header class="navbar" th:fragment="navbar">', why: 'Keeps the class for the CSS and adds the name the pages ask for.' },
          ],
          answer: 2,
          checks: ['navbar'],
          sources: [{ name: 'th:fragment', from: 'here', find: 'th:fragment="scripts"', note: 'The <script> at the bottom is a fragment already, named scripts.' }],
          result: "Every page's <header th:replace=\"~{todos/base :: navbar}\"> becomes this header.",
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
- todo-form.html is the Add Todo page. \`th:object="\${todo}"\` binds the form to the TodoRequest from the controller, \`th:field="*{title}"\` binds the input to its title, and \`th:errors\` shows the message of a failed rule.
- style.css is plain CSS, linked by base.html.
- script.js asks before deleting. Thymeleaf already drew the page; JavaScript is an extra here.

The browser checks the title first (required, maxlength), and the server checks it again with @Valid: anyone can skip the browser.

This app has no Spring Security yet, so its forms carry no CSRF token. Adding it comes after CRUD works.`,
      adds: [
        { path: `${RES}/templates/todos/todo-form.html`, about: 'The Add Todo page: a form bound to TodoRequest.', content: TODO_FORM_HTML },
        { path: `${RES}/static/css/style.css`, about: 'The styles base.html links on every page.', content: STYLE_CSS },
        { path: `${RES}/static/js/script.js`, about: 'Asks before a todo is deleted. The page works without it.', content: SCRIPT_JS },
      ],
      quiz: {
        question: 'The input in todo-form.html has th:field="*{title}". What does that do?',
        options: ['It hard-codes the word "title" into the input', "It binds the input to the title of the form's object: its name, id and value", 'It sends the title straight to MySQL'],
        answer: 1,
        explain: '*{...} reads from the th:object, here the TodoRequest. th:field writes name="title", id="title" and the current value, so a form that failed validation keeps what the user typed.',
      },
    },
    {
      id: 'list-bug-hunt',
      world: 'templates',
      kind: 'bugfix',
      boss: true,
      title: 'Bug hunt: the todo list page',
      summary: 'Missing todos, a 405, a 400, and a title that runs JavaScript.',
      lesson: `todo-list.html is the main page: it shows every todo with a Complete and a Delete button. Both buttons are small POST forms, because they change data.

This version has four bugs:
- with todos in the database, the page shows neither todos nor "No todos yet"
- pressing Complete answers 405: "Request method 'GET' is not supported"
- pressing Delete answers 400: Spring cannot turn "\${todo.id}" into a number
- a todo titled <script>alert('hi')</script> runs that script for everyone who opens the page

Fix them so every test passes.`,
      path: `${RES}/templates/todos/todo-list.html`,
      about: 'The main page: every todo with its Complete and Delete buttons.',
      starter: LIST_BUGGY,
      solution: LIST_SOLUTION,
      checks: [
        { id: 'each', name: 'The page loops over the todos', hint: 'The controller added the list as "todos". th:each="todo : ${todos}" reads it; ${todo} does not exist.', type: 'matches', value: /th:each=["']\s*todo\s*:\s*\$\{todos\}\s*["']/.source },
        { id: 'toggle-post', name: 'Complete sends a POST', hint: 'The controller only accepts POST for /todos/toggle/{id}. Set method="post" on that form.', type: 'matches', value: /<form(?=[^>]*th:action=["']@\{\/todos\/toggle\/\{id\}\(id=\$\{todo\.id\}\)\}["'])(?=[^>]*method=["'](?:post|POST)["'])/.source },
        { id: 'delete-url', name: "Delete posts to this todo's URL", hint: 'Inside @{...}, ${...} is not evaluated. Use a placeholder and fill it in: @{/todos/delete/{id}(id=${todo.id})}', type: 'matches', value: /th:action=["']@\{\/todos\/delete\/\{id\}\(id=\$\{todo\.id\}\)\}["']/.source },
        { id: 'escaped', name: 'Titles are escaped, so a todo cannot inject HTML', hint: 'th:utext prints raw HTML. th:text escapes it, so <script> shows up as text: th:text="${todo.title}"', type: 'matches', value: /^(?![\s\S]*th:utext)[\s\S]*th:text=["']\$\{todo\.title\}["']/.source },
      ],
    },
    {
      id: 'run-site',
      world: 'templates',
      kind: 'command',
      title: 'Run the site',
      summary: 'Start the app, fetch the list with curl, and watch validation refuse an empty title.',
      lesson: `Everything is in place. Start the app and ask for /todos with curl, the way a browser would.

What comes back is the point of a monolith: finished HTML. The controller fetched the todos through the service and the repository, Thymeleaf turned them into a page, and no JavaScript had to build anything.

Then post an empty title. The browser would stop you (the input is required), but curl is not a browser, and the server checks again.`,
      cwd: '',
      steps: [
        {
          goal: 'Start the application.',
          hint: 'Windows: .\\mvnw.cmd spring-boot:run. macOS / Linux: ./mvnw spring-boot:run',
          accept: RUN_COMMANDS,
          output: RUN_STARTS(8, false),
          explain: 'The table already exists, so Hibernate had nothing to create. Visit http://localhost:8080/todos in a browser, or keep going with curl.',
        },
        {
          goal: 'Ask for the list page: http://localhost:8080/todos',
          hint: 'curl sends a GET request when you only give it a URL.',
          accept: ['curl http://localhost:8080/todos', 'curl localhost:8080/todos', 'curl http://127.0.0.1:8080/todos'],
          output: RENDERED_LIST,
          explain: 'Finished HTML: the fragments from base.html are in place, and @{...} wrote /css/style.css and /todos/new. The th: attributes are gone.',
        },
        {
          goal: 'Post an empty title to /todos and see what the server says.',
          hint: 'curl -X POST -d "title=" http://localhost:8080/todos',
          accept: ['curl -X POST -d "title=" http://localhost:8080/todos'],
          pattern: 'curl (?=.*(?:-d|--data(?:-raw|-urlencode)?) )(?=.*title=(?:"|\\s|$))(?=.*localhost:8080/todos).*',
          output: RENDERED_FORM_ERROR,
          explain: '@Valid ran @NotBlank, the BindingResult caught the error, and the controller sent the form back with "Title cannot be empty". Nothing was saved.',
        },
      ],
    },

    // ---- World 5: Test Lab -----------------------------------------------------------------
    {
      id: 'first-test',
      world: 'testing',
      kind: 'edit',
      title: 'Test the service',
      summary: 'Unit tests with Mockito: no Spring, no database.',
      lesson: `The service holds the rules, so test it first. A unit test checks one class on its own: no Spring, no MySQL, and it runs in milliseconds.

Mockito supplies the repository. \`@Mock\` makes a fake TodoRepository, \`@InjectMocks\` builds a real TodoService with the fake passed into its constructor, \`when(...).thenReturn(...)\` says what the fake answers, and \`verify(...)\` checks how it was called.

JUnit's assertions check the results: \`assertEquals(expected, actual)\`, \`assertTrue(condition)\` and \`assertThrows(Exception.class, () -> …)\`. Fill in the four missing ones.`,
      path: `${TEST}/service/TodoServiceTest.java`,
      about: 'Unit tests for TodoService, with the repository mocked.',
      starter: SERVICE_TEST_STARTER,
      solution: SERVICE_TEST_SOLUTION,
      checks: [
        { id: 'trimmed', name: 'The create test checks the title was trimmed', hint: 'assertEquals("Learn Spring Boot", saved.getTitle()); with no spaces inside the quotes.', type: 'matches', value: /assertEquals\(\s*"Learn Spring Boot"\s*,\s*saved\.getTitle\(\)\s*\)/.source },
        { id: 'completed', name: 'The toggle test checks the todo is completed', hint: 'assertTrue(todo.isCompleted());', type: 'includes', value: 'assertTrue(todo.isCompleted())' },
        { id: 'saved', name: 'The toggle test checks the change was saved', hint: 'verify(todoRepository).save(todo);', type: 'includes', value: 'verify(todoRepository).save(todo)' },
        { id: 'throws', name: 'The delete test checks a missing todo throws', hint: 'assertThrows(ResourceNotFoundException.class, () -> todoService.deleteTodo(99L));', type: 'matches', value: /assertThrows\(\s*ResourceNotFoundException\.class\s*,\s*\(\)\s*->\s*todoService\.deleteTodo\(\s*99L\s*\)\s*\)/.source },
      ],
      gaps: [
        {
          marker: 'TODO 1:',
          goal: 'Assert the saved title is "Learn Spring Boot", without the spaces.',
          options: [
            { code: 'assertEquals("  Learn Spring Boot  ", saved.getTitle());', why: 'That expects the spaces to survive. createTodo trims them, so this test fails on correct code.' },
            { code: 'assertEquals("Learn Spring Boot", request.getTitle());', why: 'request still holds what the user typed, spaces included. The trimmed title is on saved, the Todo the service built.' },
            { code: 'assertEquals("Learn Spring Boot", saved.getTitle());', why: 'Expected value first, then the actual one: the title of the Todo the service saved.' },
          ],
          answer: 2,
          checks: ['trimmed'],
          sources: [
            { name: 'assertEquals', from: 'import', find: 'import static org.junit.jupiter.api.Assertions.assertEquals', note: 'From JUnit. A static import, so no class name is needed in front of it.' },
            { name: 'saved', from: 'here', find: 'Todo saved = todoService.createTodo(request)', note: 'What createTodo returned: the fake save hands back whatever it was given.' },
            { name: 'getTitle', from: 'file', path: `${JAVA}/model/Todo.java`, find: 'public String getTitle()', note: "The entity's getter." },
          ],
          result: 'If it fails, JUnit stops the test and prints both values: expected, then what it got.',
        },
        {
          marker: 'TODO 2:',
          goal: 'Assert the todo is now completed.',
          options: [
            { code: 'assertTrue(todo.isCompleted());', why: 'The todo started as not completed. After one toggle it must be.' },
            { code: 'assertTrue(todo.completed);', why: "completed is private in Todo. Outside the class you go through its getter, isCompleted(): this does not compile." },
            { code: 'assertFalse(todo.isCompleted());', why: 'The todo started as false. A toggle makes it true, so this fails on correct code.' },
          ],
          answer: 0,
          checks: ['completed'],
          sources: [
            { name: 'assertTrue', from: 'import', find: 'import static org.junit.jupiter.api.Assertions.assertTrue', note: 'From JUnit, imported at the top.' },
            { name: 'todo', from: 'here', find: 'Todo todo = new Todo("Learn JPA", false)', note: 'The fake findById hands this exact object to the service.' },
            { name: 'isCompleted', from: 'file', path: `${JAVA}/model/Todo.java`, find: 'public boolean isCompleted()', note: "The entity's getter for a boolean: is, not get." },
          ],
        },
        {
          marker: 'TODO 3:',
          goal: 'Verify the repository saved that same todo.',
          options: [
            { code: 'verify(todoRepository).save(any());', why: 'It passes for any object at all, even a brand-new Todo. Name the todo you expect.' },
            { code: 'verify(todoRepository).save(todo);', why: 'Passes only if save was called with this exact todo, the one findById returned.' },
            { code: 'verify(todoRepository.save(todo));', why: 'verify takes the mock first: verify(todoRepository).save(todo). Here save runs first, and Mockito fails because what verify got is not a mock.' },
          ],
          answer: 1,
          checks: ['saved'],
          sources: [
            { name: 'verify', from: 'import', find: 'import static org.mockito.Mockito.verify', note: 'From Mockito, imported at the top.' },
            { name: 'todoRepository', from: 'here', find: 'private TodoRepository todoRepository', note: 'The fake made by @Mock, the same one @InjectMocks handed to the service.' },
          ],
        },
        {
          marker: 'TODO 4:',
          goal: 'Assert deleteTodo(99L) throws ResourceNotFoundException.',
          options: [
            { code: 'todoService.deleteTodo(99L);', why: 'Nothing catches the exception, so the test ends here and JUnit reports an error, not a pass.' },
            { code: 'assertThrows(ResourceNotFoundException.class, todoService.deleteTodo(99L));', why: 'Without () ->, Java runs deleteTodo(99L) before assertThrows can catch anything, and a void call is no lambda: this does not compile.' },
            { code: 'assertThrows(ResourceNotFoundException.class, () -> todoService.deleteTodo(99L));', why: '() -> wraps the call in a lambda, so it runs inside assertThrows, which passes only if that exception is thrown.' },
          ],
          answer: 2,
          checks: ['throws'],
          sources: [
            { name: 'assertThrows', from: 'import', find: 'import static org.junit.jupiter.api.Assertions.assertThrows', note: 'From JUnit, imported at the top.' },
            { name: 'ResourceNotFoundException', from: 'file', path: `${JAVA}/exception/ResourceNotFoundException.java`, find: 'public class ResourceNotFoundException', note: 'Your exception from Service Forest, imported at the top.' },
            { name: 'todoService', from: 'here', find: 'private TodoService todoService', note: 'The real service, built by @InjectMocks with the fake repository.' },
          ],
          result: 'Proves a missing todo fails clearly. The next line checks nothing was deleted.',
        },
      ],
    },
    {
      id: 'run-tests',
      world: 'testing',
      kind: 'command',
      title: 'Test, package, ship one JAR',
      summary: 'Run every test, build the JAR, and start the app from it.',
      lesson: `\`mvnw test\` compiles the tests and runs all of them: your TodoServiceTest, and the generated TodoappApplicationTests, which starts the whole application, so MySQL must be running and DB_PASSWORD set.

\`mvnw clean package\` deletes target/, runs the tests again and builds one JAR with your code, every library and Tomcat inside. That single file is the whole monolith: \`java -jar\` runs it on any machine with Java.`,
      cwd: '',
      steps: [
        {
          goal: 'Run the tests.',
          hint: 'Windows: .\\mvnw.cmd test. macOS / Linux: ./mvnw test',
          accept: ['.\\mvnw.cmd test', './mvnw test', 'mvnw test', 'mvnw.cmd test', 'mvn test'],
          output: TEST_RUN,
          explain: 'Four tests, all green: three from you, and the one that proves the application starts.',
        },
        {
          goal: 'Clean, test and package the app into a JAR.',
          hint: 'Windows: .\\mvnw.cmd clean package. macOS / Linux: ./mvnw clean package',
          accept: ['.\\mvnw.cmd clean package', './mvnw clean package', 'mvnw clean package', 'mvnw.cmd clean package', 'mvn clean package'],
          output: PACKAGE_RUN,
          adds: [{ path: 'target/todoapp-0.0.1-SNAPSHOT.jar', about: 'The whole app in one runnable file. Rebuilt by every package, never committed.', generated: true }],
          explain: 'target/todoapp-0.0.1-SNAPSHOT.jar is the whole monolith.',
        },
        {
          goal: 'Run the JAR with java.',
          hint: 'java -jar target/todoapp-0.0.1-SNAPSHOT.jar',
          accept: ['java -jar target/todoapp-0.0.1-SNAPSHOT.jar', 'java -jar target\\todoapp-0.0.1-SNAPSHOT.jar', 'java -jar .\\target\\todoapp-0.0.1-SNAPSHOT.jar', 'java -jar ./target/todoapp-0.0.1-SNAPSHOT.jar'],
          output: JAR_RUN,
          explain: 'No Maven, no VS Code: just Java and one file. This is how the app runs on a server.',
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

Initializr's .gitignore keeps target/, HELP.md and IDE folders out. It knows nothing about secrets, which is why the database password lives in DB_PASSWORD and not in application.properties.

In the next level you send this commit to GitHub.`,
      cwd: '',
      steps: [
        { goal: 'Create a git repository here.', hint: 'git, then the word for "start".', accept: ['git init'], output: 'Initialized empty Git repository in /todoapp/.git/', adds: [{ path: '.git/', about: "Git's database of every commit. Never edit it by hand.", generated: true }] },
        ...GIT_IDENTITY,
        { goal: 'Stage every file.', hint: 'git add with a dot stages everything under the current folder.', accept: ['git add .', 'git add -A', 'git add --all'], explain: 'Nothing is printed: staging is silent. target/ and HELP.md are skipped because .gitignore lists them.' },
        {
          goal: 'Commit with a message, for example "feat: Spring Boot todo app".',
          hint: 'git commit -m "your message"',
          accept: ['git commit -m "feat: Spring Boot todo app"'],
          pattern: 'git commit -m ".+"',
          output: '[main (root-commit) 5b7e1c9] feat: Spring Boot todo app\n 20 files changed, 766 insertions(+)',
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
      lesson: pushLesson('todoapp'),
      cwd: '',
      steps: pushSteps('todoapp', 46),
    },
    {
      id: 'trace-request',
      world: 'production',
      kind: 'architecture',
      boss: true,
      title: 'Final boss: trace a request',
      summary: 'Put every stop of "open the list" in order, from controller to finished HTML.',
      lesson: `You have built every piece. Now prove you know how they connect.

A user opens http://localhost:8080/todos. Put the stops that request passes through in order, from the controller to the HTML Spring sends back. Each card lists the files that do that job: open them if you need a reminder.`,
      nodes: [
        { id: 'controller', label: 'Controller', role: 'TodoController.listTodos answers GET /todos and asks the service for the todos.', files: [`${JAVA}/controller/TodoController.java`] },
        { id: 'service', label: 'Service', role: 'TodoService.getAllTodos asks the repository for every todo, newest first.', files: [`${JAVA}/service/TodoService.java`] },
        { id: 'repository', label: 'Repository', role: 'TodoRepository.findAll comes from JpaRepository: Spring Data JPA wrote it for you.', files: [`${JAVA}/repository/TodoRepository.java`] },
        { id: 'jpa', label: 'JPA / Hibernate', role: 'Hibernate turns findAll into SELECT … FROM todos ORDER BY id DESC, and each row into a Todo.', files: [`${JAVA}/model/Todo.java`] },
        { id: 'mysql', label: 'MySQL', role: 'Returns the rows of todo_db.todos, over the connection set in application.properties.', files: [`${RES}/application.properties`] },
        { id: 'thymeleaf', label: 'Thymeleaf', role: 'The controller returned "todos/todo-list": Thymeleaf fills todo-list.html, with the fragments from base.html.', files: [`${RES}/templates/todos/todo-list.html`, `${RES}/templates/todos/base.html`] },
      ],
      returnTrip: 'Spring sends the finished HTML to the browser, which then fetches /css/style.css and /js/script.js from static/. Adding a todo takes the same road: the form posts to /todos, @Valid checks the TodoRequest, the service saves a new Todo, and the controller redirects back here.',
    },
  ],
  glossary: GLOSSARY,
}

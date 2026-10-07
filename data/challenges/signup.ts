export interface GlossaryTerm {
  term: string
  definition: string
}

export interface Block {
  id: string
  label: string
  code: string
  what: string
  whyHere?: string
  whyWrong?: string
}

export interface ScaffoldLine {
  type: 'line' | 'slot'
  text?: string
  slot?: number
  /** Indentation (in spaces) the dropped block is rendered at. */
  indent?: number
}

export interface ArchitectureNode {
  id: string
  label: string
  kind: 'client' | 'service' | 'database'
}

export interface ArchitectureMapping {
  nodeIds: string[]
  arrowIds?: string[]
  hint: string
}

export type Stack = 'express' | 'django' | 'spring'

export const stackLabels: Record<Stack, string> = {
  express: 'Node.js + Express',
  django: 'Python + Django',
  spring: 'Java + Spring Boot',
}

export interface ProjectFile {
  path: string
  /** One-line explanation shown in the explorer and above the file. */
  about: string
  /** Read-only contents. The challenge file has none: it is built from the scaffold and blocks. */
  content?: string
  challenge?: boolean
  /** Created by a tool (node_modules, venv, lock files): dimmed in the explorer and never pushed. */
  generated?: boolean
  /**
   * Made by a setup command but not used by this project (Vite's demo CSS, Django's asgi.py):
   * shown locked in the explorer and never opened. Still pushed, since the real command makes it.
   */
  unused?: boolean
}

export interface StackVariant {
  projectName: string
  /** Replaces the challenge scaffold for this stack. */
  scaffold?: ScaffoldLine[]
  /** Block id → code in this stack. Missing ids fall back to the block's own code. */
  blocks?: Record<string, string>
  files: ProjectFile[]
  /** Folder path → what lives there. */
  folders: Record<string, string>
}

export interface StepGuide {
  /** Short category of code that belongs in the slot, e.g. "Database read". */
  kind: string
  /** What the code in that slot has to achieve, without naming the exact block. */
  goal: string
}

export interface Challenge {
  id: string
  title: string
  fileName: string
  scaffold: ScaffoldLine[]
  blocks: Block[]
  /** One entry per slot, in slot order. */
  steps?: StepGuide[]
  glossary: GlossaryTerm[]
  reflections?: { question: string; answer: string }[]
  architecture: { nodes: ArchitectureNode[]; arrows: { id: string; from: string; to: string; label?: string }[]; mappings: Record<string, ArchitectureMapping> }
  stacks?: Partial<Record<Stack, StackVariant>>
}

const line = (text: string): ScaffoldLine => ({ type: 'line', text })
const slots = (count: number, indent: number): ScaffoldLine[] => Array.from({ length: count }, (_, index) => ({ type: 'slot', slot: index + 1, indent }))

export const signupChallenge: Challenge = {
  id: 'signup',
  title: 'Signup Flow',
  fileName: 'signupController.js',
  scaffold: [
    line('const bcrypt = require("bcrypt");'),
    line('const User = require("../models/User");'),
    line(''),
    line('const signup = async (req, res) => {'),
    line('  try {'),
    ...slots(6, 4),
    line('  } catch (error) {'),
    line('    return res.status(500).json({ message: "Something went wrong" });'),
    line('  }'),
    line('};'),
    line(''),
    line('module.exports = { signup };'),
  ],
  blocks: [
    { id: 'extract', label: 'Read input from request', code: 'const { name, email, password } = req.body;', what: 'Pulls the fields we need out of the JSON the client sent, using destructuring.', whyHere: 'Everything after this uses these values, so it has to come first.' },
    { id: 'validate', label: 'Validate input', code: 'if (!name || !email || !password) {\n  return res.status(400).json({ message: "All fields are required" });\n}', what: 'Stops early with 400 Bad Request if any field is missing. Never trust client data.', whyHere: 'Validate before touching the database, so bad requests never cost a DB call.' },
    { id: 'exists', label: 'Check if user already exists', code: 'const existingUser = await User.findOne({ email });\nif (existingUser) {\n  return res.status(409).json({ message: "User already exists, please login" });\n}', what: 'Looks up the email. findOne returns the user or null. 409 Conflict means it clashes with existing data.', whyHere: 'Check this before hashing, because hashing is deliberately slow and would be wasted work.' },
    { id: 'hash', label: 'Hash & salt the password', code: 'const salt = await bcrypt.genSalt(10);\nconst hashedPassword = await bcrypt.hash(password, salt);', what: 'The salt is random data mixed into the password, so identical passwords produce different hashes. 10 is the cost factor: higher means slower, which means harder to brute-force.', whyHere: 'We need the hash before saving, because the raw password must never reach the database.' },
    { id: 'save', label: 'Save user to database', code: 'const user = await User.create({ name, email, password: hashedPassword });', what: 'Creates and saves a new user document. Note that we store hashedPassword, not password.', whyHere: 'Only after validation, the duplicate check, and hashing is it safe to write.' },
    { id: 'respond', label: 'Send success response', code: 'return res.status(201).json({ message: "Signup successful", userId: user._id });', what: '201 Created is the correct status for a new resource. It returns only the id and never the password hash.', whyHere: "The response is always last. Once it's sent, the request is finished." },
    { id: 'bad-save', label: 'Save user to database', code: 'const user = await User.create({ name, email, password });', what: 'A database write that looks plausible.', whyWrong: 'Stores the plain-text password. If the database leaks, every user\'s password is exposed.' },
    { id: 'bad-hash', label: 'Hash the password', code: 'const hashedPassword = bcrypt.hash(password, 10);', what: 'A shorter password hashing attempt.', whyWrong: 'Missing await. bcrypt.hash returns a Promise, so hashedPassword would be a Promise object, not a string.' },
    { id: 'bad-response', label: 'Send success response', code: 'return res.status(200).json(user);', what: 'A response that sends the new user.', whyWrong: 'Sends the whole user document back, including the password hash. 201 is also more accurate than 200 for creating something.' },
  ],
  steps: [
    { kind: 'Request input', goal: 'Pull the fields this endpoint needs out of the incoming request.' },
    { kind: 'Guard clause', goal: 'Stop early if anything required is missing. Responds 400.' },
    { kind: 'Database read', goal: 'Look for existing data that would clash with this signup. Responds 409.' },
    { kind: 'Security', goal: 'Transform the secret so it is never stored as the user typed it.' },
    { kind: 'Database write', goal: 'Persist the new record, using only safe values.' },
    { kind: 'Response', goal: 'Tell the client it worked without leaking private fields. Responds 201.' },
  ],
  reflections: [
    { question: 'Why do we check if the user exists BEFORE hashing?', answer: 'Hashing is deliberately slow. Checking first avoids wasting CPU on a request that will be rejected as a duplicate.' },
    { question: 'Why do we return userId instead of the whole user object?', answer: 'The whole object could expose the password hash or other private fields. Returning only the id follows least-privilege data sharing.' },
  ],
  architecture: {
    nodes: [
      { id: 'client', label: 'Client', kind: 'client' },
      { id: 'validation', label: 'Signup Validation', kind: 'service' },
      { id: 'logic', label: 'Signup Logic', kind: 'service' },
      { id: 'database', label: 'Database', kind: 'database' },
    ],
    arrows: [
      { id: 'client-validation', from: 'client', to: 'validation' },
      { id: 'validation-logic', from: 'validation', to: 'logic' },
      { id: 'logic-database-read', from: 'logic', to: 'database', label: 'read' },
      { id: 'database-logic-read', from: 'database', to: 'logic', label: 'read' },
      { id: 'logic-database-write', from: 'logic', to: 'database', label: 'write' },
      { id: 'logic-client-response', from: 'logic', to: 'client', label: 'response' },
    ],
    mappings: {
      extract: { nodeIds: ['validation'], hint: 'What data did the client send us?' },
      validate: { nodeIds: ['validation'], hint: 'What is the cheapest check before touching the database?' },
      exists: { nodeIds: ['logic'], arrowIds: ['logic-database-read', 'database-logic-read'], hint: 'What should happen if someone signs up twice with the same email?' },
      hash: { nodeIds: ['logic'], hint: 'Would you want your raw password sitting in a database?' },
      save: { nodeIds: ['logic'], arrowIds: ['logic-database-write'], hint: 'Where should the safe user record go?' },
      respond: { nodeIds: ['client'], arrowIds: ['logic-client-response'], hint: 'How does the client learn signup succeeded?' },
    },
  },
  glossary: [
    { term: 'req.body', definition: 'Data the client sent in the request body. Needs express.json() middleware to be parsed.' },
    { term: 'await', definition: 'Pauses this function until the Promise resolves, without blocking the server.' },
    { term: 'findOne', definition: 'Mongoose method that returns the first matching document, or null.' },
    { term: '400', definition: 'Bad Request: the client sent invalid or missing data.' },
    { term: '409', definition: 'Conflict: the request clashes with existing data, like a duplicate email.' },
    { term: '201', definition: 'Created: a new resource was successfully created.' },
    { term: '500', definition: 'Internal Server Error: something failed on our side.' },
    { term: 'genSalt', definition: 'Generates a random salt. The number is the cost factor (rounds).' },
    { term: 'bcrypt.hash', definition: "One-way function that turns a password into a hash. It can't be reversed." },
    { term: 'return', definition: 'Stops the function here so no code below runs. This prevents sending two responses.' },
    { term: '_id', definition: "MongoDB's auto-generated unique id for every document." },
    { term: 'try / catch', definition: 'If any awaited call throws (e.g. the DB is down), execution jumps to catch and we respond with 500.' },
  ],
  stacks: {
    express: {
      projectName: 'signup-api',
      folders: {
        src: 'All application code. Config and entry files stay at the project root.',
        'src/config': 'Connection setup. Secrets come from environment variables, never from the code.',
        'src/controllers': 'Request handlers: the logic that runs when an endpoint is hit. You are building one.',
        'src/models': 'Data shapes: what a User document looks like in MongoDB.',
        'src/routes': 'URL → controller wiring. Routes stay thin and hand the request to a controller.',
      },
      files: [
        {
          path: 'src/controllers/signupController.js',
          about: 'Handles POST /api/auth/signup. Build it from the blocks on the right.',
          challenge: true,
        },
        {
          path: 'src/config/db.js',
          about: 'Opens the MongoDB connection once, at startup.',
          content: `const mongoose = require("mongoose");

const connectDB = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");
};

module.exports = connectDB;`,
        },
        {
          path: 'src/models/User.js',
          about: 'The User schema. User.findOne and User.create in the controller come from here.',
          content: `const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    // Stores the bcrypt hash, never the raw password
    password: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);`,
        },
        {
          path: 'src/routes/auth.js',
          about: 'Maps POST /signup to the signup controller.',
          content: `const express = require("express");
const { signup } = require("../controllers/signupController");

const router = express.Router();

router.post("/signup", signup);

module.exports = router;`,
        },
        {
          path: 'src/app.js',
          about: 'Builds the Express app: JSON parsing first, then the routes.',
          content: `const express = require("express");
const authRoutes = require("./routes/auth");

const app = express();

// Without this, req.body is undefined
app.use(express.json());

app.use("/api/auth", authRoutes);

module.exports = app;`,
        },
        {
          path: 'server.js',
          about: 'Entry point: loads env vars, connects to the database, then starts listening.',
          content: `require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
});`,
        },
        {
          path: '.env.example',
          about: 'The env vars the app expects. Copy to .env and fill in real values.',
          content: `PORT=5000
MONGO_URI=mongodb://localhost:27017/codeflow`,
        },
        {
          path: 'package.json',
          about: 'Dependencies and the start script.',
          content: `{
  "name": "signup-api",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "mongoose": "^8.7.0"
  }
}`,
        },
      ],
    },
    django: {
      projectName: 'signup-django',
      scaffold: [
        line('from django.contrib.auth.hashers import make_password'),
        line('from rest_framework.decorators import api_view'),
        line('from rest_framework.response import Response'),
        line(''),
        line('from .models import User'),
        line(''),
        line(''),
        line('@api_view(["POST"])'),
        line('def signup(request):'),
        line('    try:'),
        ...slots(6, 8),
        line('    except Exception:'),
        line('        return Response({"message": "Something went wrong"}, status=500)'),
      ],
      blocks: {
        extract: 'name = request.data.get("name")\nemail = request.data.get("email")\npassword = request.data.get("password")',
        validate: 'if not name or not email or not password:\n    return Response({"message": "All fields are required"}, status=400)',
        exists: 'existing_user = User.objects.filter(email=email).first()\nif existing_user:\n    return Response({"message": "User already exists, please login"}, status=409)',
        hash: 'hashed_password = make_password(password)',
        save: 'user = User.objects.create(name=name, email=email, password=hashed_password)',
        respond: 'return Response({"message": "Signup successful", "userId": user.id}, status=201)',
      },
      folders: {
        accounts: 'A Django app: one feature (user accounts) with its own models, views and URLs.',
        config: 'Project-level settings and the root URL table.',
      },
      files: [
        {
          path: 'accounts/views.py',
          about: 'The signup view for POST /api/auth/signup/. Build it from the blocks on the right.',
          challenge: true,
        },
        {
          path: 'accounts/models.py',
          about: 'The User model. User.objects.filter and User.objects.create come from here.',
          content: `from django.db import models


class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    # Stores the output of make_password, never the raw password
    password = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)`,
        },
        {
          path: 'accounts/urls.py',
          about: 'Maps signup/ to the view.',
          content: `from django.urls import path

from . import views

urlpatterns = [
    path("signup/", views.signup),
]`,
        },
        {
          path: 'config/settings.py',
          about: 'Installed apps and the database connection, read from environment variables.',
          content: `import os

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "rest_framework",
    "accounts",
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ["DB_NAME"],
        "USER": os.environ["DB_USER"],
        "PASSWORD": os.environ["DB_PASSWORD"],
        "HOST": os.environ.get("DB_HOST", "localhost"),
    }
}`,
        },
        {
          path: 'config/urls.py',
          about: 'Root URL table: everything under api/auth/ goes to the accounts app.',
          content: `from django.urls import include, path

urlpatterns = [
    path("api/auth/", include("accounts.urls")),
]`,
        },
        {
          path: 'manage.py',
          about: 'Django’s command-line entry point (runserver, migrate, …).',
          content: `#!/usr/bin/env python
import os
import sys

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)`,
        },
        {
          path: 'requirements.txt',
          about: 'Python dependencies.',
          content: `Django>=5.1
djangorestframework>=3.15
psycopg[binary]>=3.2`,
        },
      ],
    },
    spring: {
      projectName: 'signup-spring',
      scaffold: [
        line('package com.codeflow.auth;'),
        line(''),
        line('import java.util.Optional;'),
        line('import org.springframework.http.ResponseEntity;'),
        line('import org.springframework.security.crypto.password.PasswordEncoder;'),
        line('import org.springframework.web.bind.annotation.*;'),
        line(''),
        line('@RestController'),
        line('@RequestMapping("/api/auth")'),
        line('public class SignupController {'),
        line('  private final UserRepository userRepository;'),
        line('  private final PasswordEncoder passwordEncoder;'),
        line(''),
        line('  public SignupController(UserRepository userRepository, PasswordEncoder passwordEncoder) {'),
        line('    this.userRepository = userRepository;'),
        line('    this.passwordEncoder = passwordEncoder;'),
        line('  }'),
        line(''),
        line('  @PostMapping("/signup")'),
        line('  public ResponseEntity<?> signup(@RequestBody SignupRequest request) {'),
        line('    try {'),
        ...slots(6, 6),
        line('    } catch (Exception error) {'),
        line('      return ResponseEntity.internalServerError().body("Something went wrong");'),
        line('    }'),
        line('  }'),
        line('}'),
      ],
      blocks: {
        extract: 'String name = request.name();\nString email = request.email();\nString password = request.password();',
        validate: 'if (name == null || name.isBlank() || email == null || email.isBlank() || password == null || password.isBlank()) {\n  return ResponseEntity.badRequest().body("All fields are required");\n}',
        exists: 'Optional<User> existingUser = userRepository.findByEmail(email);\nif (existingUser.isPresent()) {\n  return ResponseEntity.status(409).body("User already exists, please login");\n}',
        hash: 'String hashedPassword = passwordEncoder.encode(password);',
        save: 'User user = userRepository.save(new User(name, email, hashedPassword));',
        respond: 'return ResponseEntity.status(201).body(new SignupResponse(user.getId()));',
      },
      folders: {
        'src/main': 'Production code. Tests would live next to it in src/test.',
        'src/main/java/com/codeflow': 'Java packages. The folder path must match the package name.',
        'src/main/java/com/codeflow/auth': 'The auth feature: controller, request/response records, entity and repository.',
        'src/main/java/com/codeflow/config': 'Beans the app wires in, like the PasswordEncoder.',
        'src/main/resources': 'Non-code configuration, like the database URL.',
      },
      files: [
        {
          path: 'src/main/java/com/codeflow/auth/SignupController.java',
          about: 'Handles POST /api/auth/signup. Build it from the blocks on the right.',
          challenge: true,
        },
        {
          path: 'src/main/java/com/codeflow/auth/SignupRequest.java',
          about: 'The JSON body, mapped to a record by @RequestBody.',
          content: `package com.codeflow.auth;

public record SignupRequest(String name, String email, String password) {}`,
        },
        {
          path: 'src/main/java/com/codeflow/auth/SignupResponse.java',
          about: 'What we send back: only the new id, never the password hash.',
          content: `package com.codeflow.auth;

public record SignupResponse(Long userId) {}`,
        },
        {
          path: 'src/main/java/com/codeflow/auth/User.java',
          about: 'The JPA entity, mapped to the users table.',
          content: `package com.codeflow.auth;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  @Column(unique = true, nullable = false)
  private String email;

  // Stores the BCrypt hash, never the raw password
  @Column(nullable = false)
  private String password;

  protected User() {}

  public User(String name, String email, String password) {
    this.name = name;
    this.email = email;
    this.password = password;
  }

  public Long getId() {
    return id;
  }
}`,
        },
        {
          path: 'src/main/java/com/codeflow/auth/UserRepository.java',
          about: 'Database access. Spring Data writes findByEmail from the method name.',
          content: `package com.codeflow.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByEmail(String email);
}`,
        },
        {
          path: 'src/main/java/com/codeflow/config/SecurityConfig.java',
          about: 'Provides the PasswordEncoder the controller asks for in its constructor.',
          content: `package com.codeflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class SecurityConfig {
  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(10);
  }
}`,
        },
        {
          path: 'src/main/java/com/codeflow/SignupApplication.java',
          about: 'Entry point. @SpringBootApplication scans this package and everything below it.',
          content: `package com.codeflow;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SignupApplication {
  public static void main(String[] args) {
    SpringApplication.run(SignupApplication.class, args);
  }
}`,
        },
        {
          path: 'src/main/resources/application.properties',
          about: 'Database connection, read from environment variables.',
          content: `spring.datasource.url=\${DB_URL}
spring.datasource.username=\${DB_USER}
spring.datasource.password=\${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=validate`,
        },
        {
          path: 'pom.xml',
          about: 'Maven build file: Spring Boot starters and the PostgreSQL driver.',
          content: `<project>
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.4</version>
  </parent>
  <groupId>com.codeflow</groupId>
  <artifactId>signup-spring</artifactId>
  <dependencies>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-data-jpa</artifactId>
    </dependency>
    <dependency>
      <groupId>org.springframework.security</groupId>
      <artifactId>spring-security-crypto</artifactId>
    </dependency>
    <dependency>
      <groupId>org.postgresql</groupId>
      <artifactId>postgresql</artifactId>
    </dependency>
  </dependencies>
</project>`,
        },
      ],
    },
  },
}

export const correctOrder = ['extract', 'validate', 'exists', 'hash', 'save', 'respond']

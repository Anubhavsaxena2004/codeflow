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

export interface Challenge {
  id: string
  title: string
  fileName: string
  scaffold: ScaffoldLine[]
  blocks: Block[]
  glossary: GlossaryTerm[]
  architecture: { nodes: ArchitectureNode[]; arrows: { id: string; from: string; to: string; label?: string }[]; mappings: Record<string, ArchitectureMapping> }
}

export const signupChallenge: Challenge = {
  id: 'signup',
  title: 'Signup Flow — Express + MongoDB',
  fileName: 'signupController.js',
  scaffold: [
    { type: 'line', text: 'const bcrypt = require("bcrypt");' },
    { type: 'line', text: 'const User = require("../models/User");' },
    { type: 'line', text: '' },
    { type: 'line', text: 'const signup = async (req, res) => {' },
    { type: 'line', text: '  try {' },
    ...Array.from({ length: 6 }, (_, index) => ({ type: 'slot' as const, slot: index + 1 })),
    { type: 'line', text: '  } catch (error) {' },
    { type: 'line', text: '    return res.status(500).json({ message: "Something went wrong" });' },
    { type: 'line', text: '  }' },
    { type: 'line', text: '};' },
    { type: 'line', text: '' },
    { type: 'line', text: 'module.exports = { signup };' },
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
}

export const correctOrder = ['extract', 'validate', 'exists', 'hash', 'save', 'respond']

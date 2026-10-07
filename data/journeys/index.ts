import type { Project } from '@/lib/journeys/types'
import { djangoTodo } from './django-todo'
import { mernTodo } from './mern-todo'
import { springTodo } from './spring-todo'

/**
 * Journeys that ship with the app, in display order. An admin edit is stored in the
 * journey_projects table and replaces the bundled version with the same id.
 */
export const bundledProjects: Project[] = [mernTodo, djangoTodo, springTodo]

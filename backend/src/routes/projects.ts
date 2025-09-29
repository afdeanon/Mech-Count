import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject
} from '../controllers/projectController';

const router = express.Router();

// All project routes require authentication
router.use(authenticateToken);

// GET /api/projects - Get all projects for user
router.get('/', getProjects);

// GET /api/projects/:id - Get single project
router.get('/:id', getProject);

// POST /api/projects - Create new project
router.post('/', createProject);

// PUT /api/projects/:id - Update project
router.put('/:id', updateProject);

// DELETE /api/projects/:id - Delete project
router.delete('/:id', deleteProject);

export default router;
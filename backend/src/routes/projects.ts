import express from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addBlueprintToProject,
  removeBlueprintFromProject
} from '../controllers/projectController';

const router = express.Router();

// All project routes require authentication
router.use(authenticateToken);

// GET /api/projects - Get all projects for user
router.get('/', getProjects);

// POST /api/projects - Create new project
router.post('/', createProject);

// GET /api/projects/:projectId - Get single project
router.get('/:projectId', getProject);

// PUT /api/projects/:projectId - Update project
router.put('/:projectId', updateProject);

// DELETE /api/projects/:projectId - Delete project
router.delete('/:projectId', deleteProject);

// POST /api/projects/:projectId/blueprints - Add blueprint to project
router.post('/:projectId/blueprints', addBlueprintToProject);

// DELETE /api/projects/:projectId/blueprints/:blueprintId - Remove blueprint from project
router.delete('/:projectId/blueprints/:blueprintId', removeBlueprintFromProject);

export default router;
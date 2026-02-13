"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const projectController_1 = require("../controllers/projectController");
const router = express_1.default.Router();
// All project routes require authentication
router.use(auth_1.authenticateToken);
// GET /api/projects - Get all projects for user
router.get('/', projectController_1.getProjects);
// POST /api/projects - Create new project
router.post('/', projectController_1.createProject);
// GET /api/projects/:projectId - Get single project
router.get('/:projectId', projectController_1.getProject);
// PUT /api/projects/:projectId - Update project
router.put('/:projectId', projectController_1.updateProject);
// DELETE /api/projects/:projectId - Delete project
router.delete('/:projectId', projectController_1.deleteProject);
// POST /api/projects/:projectId/blueprints - Add blueprint to project
router.post('/:projectId/blueprints', projectController_1.addBlueprintToProject);
// DELETE /api/projects/:projectId/blueprints/:blueprintId - Remove blueprint from project
router.delete('/:projectId/blueprints/:blueprintId', projectController_1.removeBlueprintFromProject);
exports.default = router;

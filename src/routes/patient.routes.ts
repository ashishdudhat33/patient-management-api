import { Router } from 'express';
import { patientController } from '../controllers/patient.controller';
import { requireAuth } from '../middleware/auth.middleware';
import {
  validateCreatePatient,
  validateUpdatePatient,
  validatePatientId,
  validateAddressQuery,
  validateConditionQuery,
} from '../middleware/validate.middleware';

const router = Router();

// ─── Public (read-only) endpoints ──────────────────────────────────────────
// GET operations don't mutate data — they're open per the spec.
// In a stricter setup you'd protect these too, but the assignment says only
// create/update/delete need Cognito auth.

router.get('/', patientController.listAll);
router.get('/search', validateConditionQuery, patientController.searchByCondition);
router.get('/query/by-address', validateAddressQuery, patientController.findByAddress);
router.get('/query/by-condition', validateConditionQuery, patientController.findByConditionDynamo);
router.get('/:id', validatePatientId, patientController.getOne);

// ─── Protected (write) endpoints ───────────────────────────────────────────
// requireAuth validates the Cognito JWT before any mutation can happen

router.post('/', requireAuth, validateCreatePatient, patientController.create);
router.put('/:id', requireAuth, validateUpdatePatient, patientController.update);
router.delete('/:id', requireAuth, validatePatientId, patientController.remove);

export default router;

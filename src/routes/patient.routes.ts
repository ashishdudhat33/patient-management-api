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

// ─── Public endpoints ──────────────────────────────────────────

router.get('/', patientController.listAll);
router.get('/search', validateConditionQuery, patientController.searchByCondition);
router.get('/query/by-address', validateAddressQuery, patientController.findByAddress);
router.get('/query/by-condition', validateConditionQuery, patientController.findByConditionDynamo);
router.get('/:id', validatePatientId, patientController.getOne);

// ─── Protected endpoints ───────────────────────────────────────────

router.post('/', requireAuth, validateCreatePatient, patientController.create);
router.put('/:id', requireAuth, validateUpdatePatient, patientController.update);
router.delete('/:id', requireAuth, validatePatientId, patientController.remove);

export default router;

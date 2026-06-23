import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';

// Helper — run after validation chains, return 422 if anything failed
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({ field: e.type, message: e.msg })),
    });
    return;
  }
  next();
}

// ─── Validation chains ───────────────────────────────────────────────────────

export const validateCreatePatient = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('address').isObject().withMessage('Address must be an object'),
  body('address.street').trim().notEmpty().withMessage('Street is required'),
  body('address.city').trim().notEmpty().withMessage('City is required'),
  body('address.state').trim().notEmpty().withMessage('State is required'),
  body('address.zip').trim().notEmpty().withMessage('Zip is required'),
  body('address.country').trim().notEmpty().withMessage('Country is required'),

  body('conditions')
    .isArray().withMessage('Conditions must be an array')
    .custom((arr: unknown[]) => arr.every((v) => typeof v === 'string'))
    .withMessage('Each condition must be a string'),

  body('allergies')
    .isArray().withMessage('Allergies must be an array')
    .custom((arr: unknown[]) => arr.every((v) => typeof v === 'string'))
    .withMessage('Each allergy must be a string'),

  handleValidationErrors,
];

export const validateUpdatePatient = [
  param('id').isUUID().withMessage('Invalid patient ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),

  body('address').optional().isObject().withMessage('Address must be an object'),
  body('conditions').optional().isArray().withMessage('Conditions must be an array'),
  body('allergies').optional().isArray().withMessage('Allergies must be an array'),

  handleValidationErrors,
];

export const validatePatientId = [
  param('id').isUUID().withMessage('Invalid patient ID format'),
  handleValidationErrors,
];

export const validateAddressQuery = [
  query('city').trim().notEmpty().withMessage('city query param is required'),
  handleValidationErrors,
];

export const validateConditionQuery = [
  query('condition').trim().notEmpty().withMessage('condition query param is required'),
  handleValidationErrors,
];

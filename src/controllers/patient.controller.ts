import { Request, Response, NextFunction } from 'express';
import { patientService } from '../services/patient.service';
import { searchService } from '../services/search.service';
import { CreatePatientDTO, UpdatePatientDTO } from '../types/patient.types';

export const patientController = {
  // POST /patients
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: CreatePatientDTO = req.body;
      const patient = await patientService.create(dto);

      // Index in OpenSearch async — don't let a search failure block the response
      searchService.indexPatient(patient).catch((err) => {
        console.error('OpenSearch indexing failed (non-fatal):', err.message);
      });

      res.status(201).json({ success: true, data: patient });
    } catch (err) {
      next(err);
    }
  },

  // GET /patients/:id
  async getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patient = await patientService.getById(req.params.id);

      if (!patient) {
        res.status(404).json({ success: false, error: 'Patient not found' });
        return;
      }

      res.json({ success: true, data: patient });
    } catch (err) {
      next(err);
    }
  },

  // GET /patients
  async listAll(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const patients = await patientService.listAll();
      res.json({ success: true, data: patients, count: patients.length });
    } catch (err) {
      next(err);
    }
  },

  // PUT /patients/:id
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto: UpdatePatientDTO = req.body;
      const updated = await patientService.update(req.params.id, dto);

      if (!updated) {
        res.status(404).json({ success: false, error: 'Patient not found' });
        return;
      }

      // Keep the search index in sync
      searchService.indexPatient(updated).catch((err) => {
        console.error('OpenSearch re-index failed (non-fatal):', err.message);
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /patients/:id
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await patientService.delete(req.params.id);

      searchService.removePatient(req.params.id).catch((err) => {
        console.error('OpenSearch delete failed (non-fatal):', err.message);
      });

      res.json({ success: true, message: 'Patient deleted successfully' });
    } catch (err) {
      next(err);
    }
  },

  // GET /patients/query/by-address?city=London
  async findByAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const city = req.query.city as string;
      const patients = await patientService.findByCity(city);
      res.json({ success: true, data: patients, count: patients.length });
    } catch (err) {
      next(err);
    }
  },

  // GET /patients/query/by-condition?condition=Diabetes
  // Hits DynamoDB (scan fallback — for small datasets or when OpenSearch is down)
  async findByConditionDynamo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const condition = req.query.condition as string;
      const patients = await patientService.findByCondition(condition);
      res.json({ success: true, data: patients, count: patients.length });
    } catch (err) {
      next(err);
    }
  },

  // GET /patients/search?condition=Diabetes  — hits OpenSearch for fast full-text search
  async searchByCondition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const condition = req.query.condition as string;
      const patients = await searchService.searchByCondition(condition);
      res.json({ success: true, data: patients, count: patients.length });
    } catch (err) {
      next(err);
    }
  },
};

import { STAGES, INTERVIEW_TYPES, INTERVIEW_MODES, INTERVIEW_STATUS, RECOMMENDATIONS } from '../constants.js';

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const q = (name, schema = { type: 'string' }, description = '') => ({ name, in: 'query', schema, description });
const std = {
  401: { description: 'Missing or invalid token' },
  403: { description: 'Role not allowed' },
  422: { description: 'Validation failed' },
};
const ok = (schema, description = 'Success') => ({ description, content: json(schema) });
const secured = [{ bearerAuth: [] }];

const list = (name) => ({ type: 'object', properties: { data: { type: 'array', items: ref(name) }, meta: ref('PageMeta') } });
const one = (name) => ({ type: 'object', properties: { data: ref(name) } });

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'Candidate Hiring Pipeline API',
    version: '1.0.0',
    description:
      'REST API for managing candidates, interviews and feedback with JWT auth and role-based access (recruiter / interviewer).\n\nClick **Authorize** and paste the token returned by `/auth/login`.',
  },
  servers: [{ url: '/api' }],
  tags: ['Auth', 'Candidates', 'Interviews', 'Feedback', 'Dashboard', 'Activity', 'Users'].map((name) => ({ name })),
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      PageMeta: { type: 'object', properties: { total: { type: 'integer' }, page: { type: 'integer' }, limit: { type: 'integer' }, pages: { type: 'integer' } } },
      Error: { type: 'object', properties: { message: { type: 'string' }, errors: { type: 'array', items: { type: 'object', properties: { field: { type: 'string' }, message: { type: 'string' } } } } } },
      User: { type: 'object', properties: { _id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, role: { type: 'string', enum: ['recruiter', 'interviewer'] } } },
      Candidate: {
        type: 'object',
        properties: {
          _id: { type: 'string' }, name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' },
          position: { type: 'string' }, skills: { type: 'array', items: { type: 'string' } },
          experienceYears: { type: 'number' }, source: { type: 'string' }, resumeUrl: { type: 'string' },
          stage: { type: 'string', enum: STAGES },
          notes: { type: 'array', items: { type: 'object' } },
        },
      },
      CandidateInput: {
        type: 'object', required: ['name', 'email', 'position'],
        properties: {
          name: { type: 'string', example: 'Asha Verma' }, email: { type: 'string', example: 'asha@example.com' },
          phone: { type: 'string' }, position: { type: 'string', example: 'Frontend Engineer' },
          skills: { type: 'array', items: { type: 'string' }, example: ['React', 'Tailwind'] },
          experienceYears: { type: 'number', example: 3 }, source: { type: 'string', example: 'LinkedIn' },
          resumeUrl: { type: 'string' },
        },
      },
      Interview: {
        type: 'object',
        properties: {
          _id: { type: 'string' }, candidate: ref('Candidate'), interviewer: ref('User'),
          scheduledAt: { type: 'string', format: 'date-time' }, durationMins: { type: 'integer' },
          type: { type: 'string', enum: INTERVIEW_TYPES }, mode: { type: 'string', enum: INTERVIEW_MODES },
          location: { type: 'string' }, notes: { type: 'string' },
          status: { type: 'string', enum: INTERVIEW_STATUS }, feedbackId: { type: 'string', nullable: true },
        },
      },
      InterviewInput: {
        type: 'object', required: ['candidate', 'interviewer', 'scheduledAt', 'type'],
        properties: {
          candidate: { type: 'string' }, interviewer: { type: 'string' },
          scheduledAt: { type: 'string', format: 'date-time' }, durationMins: { type: 'integer', default: 60 },
          type: { type: 'string', enum: INTERVIEW_TYPES }, mode: { type: 'string', enum: INTERVIEW_MODES },
          location: { type: 'string' }, notes: { type: 'string' },
          status: { type: 'string', enum: INTERVIEW_STATUS, description: 'Only on update' },
        },
      },
      Feedback: {
        type: 'object',
        properties: {
          _id: { type: 'string' }, interview: { type: 'object' }, candidate: { type: 'object' }, interviewer: ref('User'),
          rating: { type: 'integer', minimum: 1, maximum: 5 }, recommendation: { type: 'string', enum: RECOMMENDATIONS },
          strengths: { type: 'string' }, concerns: { type: 'string' }, comments: { type: 'string' },
        },
      },
      FeedbackInput: {
        type: 'object', required: ['interview', 'rating', 'recommendation'],
        properties: {
          interview: { type: 'string' }, rating: { type: 'integer', minimum: 1, maximum: 5 },
          recommendation: { type: 'string', enum: RECOMMENDATIONS },
          strengths: { type: 'string' }, concerns: { type: 'string' }, comments: { type: 'string' },
        },
      },
    },
  },
  paths: {
    '/auth/signup': {
      post: {
        tags: ['Auth'], summary: 'Create an account',
        requestBody: { required: true, content: json({ type: 'object', required: ['name', 'email', 'password', 'role'], properties: { name: { type: 'string' }, email: { type: 'string' }, password: { type: 'string', description: 'min 8 chars, letter + number' }, role: { type: 'string', enum: ['recruiter', 'interviewer'] } } }) },
        responses: { 201: ok({ type: 'object', properties: { token: { type: 'string' }, user: ref('User') } }, 'Created'), 409: { description: 'Email already registered' }, 422: std[422] },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Log in and receive a JWT',
        requestBody: { required: true, content: json({ type: 'object', required: ['email', 'password'], properties: { email: { type: 'string' }, password: { type: 'string' } } }) },
        responses: { 200: ok({ type: 'object', properties: { token: { type: 'string' }, user: ref('User') } }), 401: { description: 'Invalid credentials' } },
      },
    },
    '/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: secured, responses: { 200: ok({ type: 'object', properties: { user: ref('User') } }), 401: std[401] } } },
    '/users': { get: { tags: ['Users'], summary: 'List users (recruiter)', security: secured, parameters: [q('role', { type: 'string', enum: ['recruiter', 'interviewer'] })], responses: { 200: ok({ type: 'object', properties: { data: { type: 'array', items: ref('User') } } }), 403: std[403] } } },
    '/dashboard': { get: { tags: ['Dashboard'], summary: 'Role-aware dashboard summary (stage counts, upcoming interviews, activity summary)', security: secured, responses: { 200: { description: 'Success' }, 401: std[401] } } },
    '/candidates': {
      get: {
        tags: ['Candidates'], summary: 'List candidates (search, filter, sort, paginate). Interviewers only see assigned candidates.', security: secured,
        parameters: [q('q', undefined, 'Search name/email/position/skills'), q('stage', undefined, 'Comma separated stages'), q('position'), q('skill'), q('minExp', { type: 'number' }), q('maxExp', { type: 'number' }), q('from', { type: 'string', format: 'date' }), q('to', { type: 'string', format: 'date' }), q('sort', { type: 'string', enum: ['createdAt', '-createdAt', 'name', '-name', 'experienceYears', '-experienceYears'] }), q('page', { type: 'integer' }), q('limit', { type: 'integer' })],
        responses: { 200: ok(list('Candidate')), 401: std[401] },
      },
      post: { tags: ['Candidates'], summary: 'Add candidate (recruiter)', security: secured, requestBody: { required: true, content: json(ref('CandidateInput')) }, responses: { 201: ok(one('Candidate'), 'Created'), 403: std[403], 409: { description: 'Duplicate email' }, 422: std[422] } },
    },
    '/candidates/{id}': {
      get: { tags: ['Candidates'], summary: 'Get candidate', security: secured, parameters: [idParam], responses: { 200: ok(one('Candidate')), 403: std[403], 404: { description: 'Not found' } } },
      put: { tags: ['Candidates'], summary: 'Edit candidate (recruiter)', security: secured, parameters: [idParam], requestBody: { required: true, content: json(ref('CandidateInput')) }, responses: { 200: ok(one('Candidate')), 403: std[403], 404: { description: 'Not found' } } },
      patch: { tags: ['Candidates'], summary: 'Partially edit candidate (recruiter)', security: secured, parameters: [idParam], requestBody: { required: true, content: json(ref('CandidateInput')) }, responses: { 200: ok(one('Candidate')) } },
      delete: { tags: ['Candidates'], summary: 'Delete candidate and related interviews/feedback (recruiter)', security: secured, parameters: [idParam], responses: { 204: { description: 'Deleted' }, 403: std[403] } },
    },
    '/candidates/{id}/stage': {
      patch: { tags: ['Candidates'], summary: 'Move candidate to a pipeline stage (recruiter)', security: secured, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', required: ['stage'], properties: { stage: { type: 'string', enum: STAGES } } }) }, responses: { 200: ok(one('Candidate')), 403: std[403], 422: std[422] } },
    },
    '/candidates/{id}/notes': {
      post: { tags: ['Candidates'], summary: 'Add a note (recruiter, or interviewer assigned to the candidate)', security: secured, parameters: [idParam], requestBody: { required: true, content: json({ type: 'object', required: ['text'], properties: { text: { type: 'string' } } }) }, responses: { 201: { description: 'Created' }, 403: std[403] } },
    },
    '/candidates/{id}/notes/{noteId}': {
      delete: { tags: ['Candidates'], summary: 'Delete a note (author or recruiter)', security: secured, parameters: [idParam, { name: 'noteId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Deleted' } } },
    },
    '/interviews': {
      get: { tags: ['Interviews'], summary: 'List interviews. Interviewers only see their own.', security: secured, parameters: [q('when', { type: 'string', enum: ['upcoming', 'past'] }), q('status', { type: 'string', enum: INTERVIEW_STATUS }), q('candidate'), q('interviewer'), q('page', { type: 'integer' }), q('limit', { type: 'integer' })], responses: { 200: ok(list('Interview')) } },
      post: { tags: ['Interviews'], summary: 'Schedule an interview (recruiter). Rejects overlapping slots for the same interviewer.', security: secured, requestBody: { required: true, content: json(ref('InterviewInput')) }, responses: { 201: ok(one('Interview'), 'Created'), 409: { description: 'Interviewer is busy' }, 422: std[422] } },
    },
    '/interviews/{id}': {
      get: { tags: ['Interviews'], summary: 'Get interview', security: secured, parameters: [idParam], responses: { 200: ok(one('Interview')) } },
      put: { tags: ['Interviews'], summary: 'Update / reschedule / cancel (recruiter)', security: secured, parameters: [idParam], requestBody: { required: true, content: json(ref('InterviewInput')) }, responses: { 200: ok(one('Interview')) } },
      patch: { tags: ['Interviews'], summary: 'Partially update (recruiter)', security: secured, parameters: [idParam], requestBody: { required: true, content: json(ref('InterviewInput')) }, responses: { 200: ok(one('Interview')) } },
      delete: { tags: ['Interviews'], summary: 'Delete interview (recruiter)', security: secured, parameters: [idParam], responses: { 204: { description: 'Deleted' } } },
    },
    '/feedback': {
      get: { tags: ['Feedback'], summary: 'List feedback. Recruiters see all, interviewers see their own.', security: secured, parameters: [q('candidate'), q('interview'), q('page', { type: 'integer' }), q('limit', { type: 'integer' })], responses: { 200: ok(list('Feedback')) } },
      post: { tags: ['Feedback'], summary: 'Submit feedback for your own interview (interviewer)', security: secured, requestBody: { required: true, content: json(ref('FeedbackInput')) }, responses: { 201: ok(one('Feedback'), 'Created'), 403: std[403], 409: { description: 'Feedback already exists' } } },
    },
    '/feedback/{id}': {
      get: { tags: ['Feedback'], summary: 'Get feedback', security: secured, parameters: [idParam], responses: { 200: ok(one('Feedback')) } },
      put: { tags: ['Feedback'], summary: 'Edit own feedback (interviewer)', security: secured, parameters: [idParam], requestBody: { required: true, content: json(ref('FeedbackInput')) }, responses: { 200: ok(one('Feedback')) } },
      patch: { tags: ['Feedback'], summary: 'Partially edit own feedback (interviewer)', security: secured, parameters: [idParam], requestBody: { required: true, content: json(ref('FeedbackInput')) }, responses: { 200: ok(one('Feedback')) } },
      delete: { tags: ['Feedback'], summary: 'Delete feedback (author or recruiter)', security: secured, parameters: [idParam], responses: { 204: { description: 'Deleted' } } },
    },
    '/activity': { get: { tags: ['Activity'], summary: 'Activity log (recruiter)', security: secured, parameters: [q('page', { type: 'integer' }), q('limit', { type: 'integer' })], responses: { 200: { description: 'Success' } } } },
    '/activity/emails': { get: { tags: ['Activity'], summary: 'Mock email outbox (recruiter)', security: secured, parameters: [q('page', { type: 'integer' }), q('limit', { type: 'integer' })], responses: { 200: { description: 'Success' } } } },
  },
};

// ---------- additions: password reset, resume, export, stage rules ----------
const P = openapi.paths;
P['/auth/signup'].post.requestBody.content['application/json'].schema.properties.inviteCode = {
  type: 'string', description: 'Required when role is recruiter',
};
P['/auth/signup'].post.description = 'Registers a first-time user. Does NOT log them in; call /auth/login afterwards.';
P['/auth/login'].post.responses[401] = { description: 'Invalid email or password' };
P['/auth/forgot-password'] = {
  post: {
    tags: ['Auth'], summary: 'Request a password reset link',
    requestBody: { required: true, content: json({ type: 'object', required: ['email'], properties: { email: { type: 'string' } } }) },
    responses: { 200: { description: 'Always succeeds. In demo mode (SHOW_RESET_LINK=true) the body includes devResetLink.' } },
  },
};
P['/auth/reset-password'] = {
  post: {
    tags: ['Auth'], summary: 'Set a new password using the emailed token',
    requestBody: { required: true, content: json({ type: 'object', required: ['token', 'password'], properties: { token: { type: 'string' }, password: { type: 'string' } } }) },
    responses: { 200: { description: 'Password updated' }, 400: { description: 'Invalid or expired token' } },
  },
};
P['/candidates'].get.parameters = [
  ...P['/candidates'].get.parameters.filter((p) => p.name !== 'sort'),
  q('sort', { type: 'string', enum: ['createdAt', '-createdAt', 'name', '-name', 'experienceYears', '-experienceYears', 'ratingAvg', '-ratingAvg'] }),
];
P['/candidates/export'] = {
  get: { tags: ['Candidates'], summary: 'Export the (filtered) candidate list as CSV (recruiter)', security: secured, parameters: P['/candidates'].get.parameters, responses: { 200: { description: 'text/csv file' }, 403: std[403] } },
};
P['/candidates/{id}/stage'].patch.summary = 'Move candidate to the NEXT stage or to Rejected (recruiter)';
P['/candidates/{id}/stage'].patch.description =
  'Flow: Applied > Screening > Technical Interview > HR Interview > Offered > Hired. Skipping or moving backwards returns 422. Hired and Rejected are final. Interviews and feedback are not required. Rejected needs rejectionReason.';
P['/candidates/{id}/stage'].patch.requestBody.content['application/json'].schema = {
  type: 'object', required: ['stage'],
  properties: {
    stage: { type: 'string', enum: STAGES },
    rejectionReason: { type: 'string', enum: ['skills_gap', 'salary_mismatch', 'culture_fit', 'withdrew', 'position_filled', 'other'] },
    rejectionNote: { type: 'string' },
  },
};
P['/candidates/{id}/resume'] = {
  post: { tags: ['Candidates'], summary: 'Upload resume: PDF/DOC/DOCX, max 5 MB (recruiter)', security: secured, parameters: [idParam], requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', properties: { resume: { type: 'string', format: 'binary' } } } } } }, responses: { 200: ok(one('Candidate')), 422: std[422] } },
  get: { tags: ['Candidates'], summary: 'Download resume (recruiter, or assigned interviewer)', security: secured, parameters: [idParam], responses: { 200: { description: 'File' }, 404: { description: 'No resume' } } },
  delete: { tags: ['Candidates'], summary: 'Remove resume (recruiter)', security: secured, parameters: [idParam], responses: { 204: { description: 'Removed' } } },
};
P['/interviews'].get.parameters.push(q('from', { type: 'string', format: 'date-time' }), q('to', { type: 'string', format: 'date-time' }));

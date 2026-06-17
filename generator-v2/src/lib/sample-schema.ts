import type { FormSchema } from '../types/schema';

/**
 * A representative extracted schema used in phase 1 in place of a real
 * Claude extraction call. The shape matches form-schema.v1.json exactly,
 * so swapping in a live extraction later is a one-line change.
 */
export const SAMPLE_WORK_PERMIT: FormSchema = {
  id: 'immd-work-permit',
  version: '0.1.0',
  meta: {
    title: 'Apply for a Work Permit',
    mda: 'Immigration Department',
    serviceType: 'permit',
    status: 'alpha',
    referencePrefix: 'WP',
    estimatedTime: '10 minutes',
    lastUpdated: '2026-05-26',
  },
  validation: { enabled: true, mode: 'onContinue' },
  flow: ['start', 'about-you', 'address', 'work', 'check', 'declaration', 'done'],
  pages: {
    start: {
      id: 'start',
      type: 'start',
      title: 'Apply for a Work Permit',
      intro: [
        'Use this service to apply for permission to work in Barbados.',
        'You will need to upload supporting documents and pay a fee.',
      ],
      eligibility: {
        heading: 'You can apply if',
        items: [
          'You have a confirmed job offer from an employer in Barbados',
          'You are at least 18 years old',
          'Your employer has agreed to sponsor your application',
        ],
      },
      whatYouNeed: {
        heading: 'Before you start',
        items: ['Your passport', 'A letter from your employer', 'Proof of qualifications'],
      },
      startButton: 'Start now',
    },
    'about-you': {
      id: 'about-you',
      type: 'question',
      title: 'About you',
      caption: true,
      fields: [
        {
          id: 'first-name',
          type: 'text',
          label: 'What is your first name?',
          hint: 'Your given name as it appears on your ID',
          required: true,
          validation: { required: true, maxLength: 50 },
          confidence: 'high',
          sourcePage: 1,
        },
        {
          id: 'last-name',
          type: 'text',
          label: 'What is your last name?',
          hint: 'Family name as on your national ID card',
          required: true,
          validation: { required: true, maxLength: 50 },
          confidence: 'high',
          sourcePage: 1,
        },
        {
          id: 'date-of-birth',
          type: 'date',
          label: 'When were you born?',
          hint: 'For example, 27 03 1987',
          required: true,
          validation: { required: true, notFuture: true },
          confidence: 'high',
          sourcePage: 1,
        },
        {
          id: 'nrn',
          type: 'text',
          label: 'What is your NRN?',
          required: true,
          validation: {
            required: true,
            pattern: '^[0-9]{6}-[0-9]{4}$',
            patternMessage: 'Enter your NRN in the format 870315-1234',
          },
          confidence: 'low',
          sourcePage: 1,
        },
        {
          id: 'nationality',
          type: 'select',
          label: 'What is your nationality?',
          hint: 'Choose from the list',
          required: true,
          options: ['Barbadian', 'Jamaican', 'Trinidadian', 'British', 'American', 'Canadian'],
          confidence: 'medium',
          sourcePage: 1,
        },
      ],
    },
    address: {
      id: 'address',
      type: 'question',
      title: 'Where do you live in Barbados?',
      caption: true,
      fields: [
        {
          id: 'street-address',
          type: 'text',
          label: 'Street address',
          required: true,
          validation: { required: true, maxLength: 120 },
          confidence: 'high',
          sourcePage: 2,
        },
        {
          id: 'parish',
          type: 'select',
          label: 'Parish',
          required: true,
          options: [
            'Christ Church',
            'St. Andrew',
            'St. George',
            'St. James',
            'St. John',
            'St. Joseph',
            'St. Lucy',
            'St. Michael',
            'St. Peter',
            'St. Philip',
            'St. Thomas',
          ],
          confidence: 'high',
          sourcePage: 2,
        },
        {
          id: 'postal-code',
          type: 'text',
          label: 'Postal code',
          hint: 'For example, BB11000',
          validation: { pattern: '^BB[0-9]{5}$', patternMessage: 'Enter a Barbados postcode like BB11000' },
          confidence: 'medium',
          sourcePage: 2,
        },
      ],
    },
    work: {
      id: 'work',
      type: 'question',
      title: 'Tell us about your job',
      caption: true,
      fields: [
        {
          id: 'employer-name',
          type: 'text',
          label: 'Name of employer',
          required: true,
          validation: { required: true },
          confidence: 'high',
          sourcePage: 3,
        },
        {
          id: 'job-title',
          type: 'text',
          label: 'Job title',
          required: true,
          validation: { required: true },
          confidence: 'high',
          sourcePage: 3,
        },
        {
          id: 'start-date',
          type: 'date',
          label: 'When do you plan to start work?',
          required: true,
          validation: { required: true },
          confidence: 'medium',
          sourcePage: 3,
        },
      ],
    },
    declaration: {
      id: 'declaration',
      type: 'declaration',
      title: 'Declaration',
      body: 'I confirm that the information I have given is true to the best of my knowledge. I understand that giving false information is an offence.',
      fields: [
        {
          id: 'consent',
          type: 'checkbox',
          label: 'I agree to the declaration above',
          required: true,
          validation: { required: true },
          confidence: 'high',
        },
      ],
    },
    check: {
      id: 'check',
      type: 'check',
      title: 'Check your answers before sending your application',
    },
    done: {
      id: 'done',
      type: 'confirmation',
      title: 'Application sent',
    },
  },
};

export function blankSchema(title: string): FormSchema {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80) || 'new-form';
  return {
    id: slug,
    version: '0.1.0',
    meta: {
      title,
      mda: '',
      status: 'alpha',
      referencePrefix: 'NEW',
    },
    validation: { enabled: true, mode: 'onContinue' },
    flow: ['start', 'page-1', 'check', 'done'],
    pages: {
      start: { id: 'start', type: 'start', title, startButton: 'Start now' },
      'page-1': { id: 'page-1', type: 'question', title: 'First question', caption: true, fields: [] },
      check: { id: 'check', type: 'check', title: 'Check your answers' },
      done: { id: 'done', type: 'confirmation', title: 'Done' },
    },
  };
}

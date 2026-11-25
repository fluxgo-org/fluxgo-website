import { cabCopy } from '../../../lib/site-flags';

// Public numbers on the home page. Update them here only.
// Each value must be true on the day it goes live. Round down, never up.
export const STATS = [
  { value: 140, suffix: '+', label: 'Members', note: 'Verified members have a work email badge' },
  { value: 50, suffix: '+', label: 'Rides shared', note: cabCopy('Intercity carpools and shared cabs', 'Intercity carpools') }
];

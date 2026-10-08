import { describe, it, expect } from 'vitest';
const { calculateIncidentSummary } = require('../server/utils/incidentSummary');

describe('Incident Summary Calculation', () => {
  it('correctly calculates counts across all triage levels', () => {
    const patients = [
      { id: 1, triage_color: 'red', pt_name: 'Patient 1' },
      { id: 2, triage_color: 'RED', pt_name: 'Patient 2' },
      { id: 3, triage_color: 'yellow', pt_name: 'Patient 3' },
      { id: 4, triage_color: 'green', pt_name: 'Patient 4' },
      { id: 5, triage_color: 'black', pt_name: 'Patient 5' },
      { id: 6, triage_color: 'white', pt_name: 'Patient 6' },
      { id: 7, triage_color: 'emergency', pt_name: 'Patient 7' }, // should map to red
      { id: 8, triage_color: 'ไม่ระบุ', pt_name: 'Patient 8' }, // defaults to green
    ];

    const summary = calculateIncidentSummary(patients, 2);

    expect(summary.red).toBe(3); // red, RED, emergency
    expect(summary.yellow).toBe(1); // yellow
    expect(summary.green).toBe(2); // green, default
    expect(summary.black).toBe(2); // black, white
    expect(summary.refuse_treatment).toBe(2);
    expect(summary.registered_count).toBe(8);
    expect(summary.total).toBe(10); // 8 registered + 2 refused
  });

  it('handles empty patient list gracefully', () => {
    const summary = calculateIncidentSummary([], 0);

    expect(summary).toEqual({
      red: 0,
      yellow: 0,
      green: 0,
      black: 0,
      refuse_treatment: 0,
      registered_count: 0,
      total: 0
    });
  });

  it('handles null and undefined arguments without crashing', () => {
    const summary = calculateIncidentSummary(null, null);

    expect(summary.registered_count).toBe(0);
    expect(summary.total).toBe(0);
  });
});

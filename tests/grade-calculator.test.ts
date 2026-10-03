import { describe, it, expect } from 'vitest';
import { GradeCalculator, DEFAULT_RUBRIC } from '../src/domain/grade-calculator';

describe('GradeCalculator — Assessment & GPA Engine', () => {
  it('should compute correct letter grade and GPA point for excellent score (A)', () => {
    // CA1: 14/15, CA2: 13/15, Assignment: 9/10, Exam: 52/60 -> Total: 88
    const result = GradeCalculator.calculateSubjectGrade(14, 13, 9, 52);
    expect(result.totalScore).toBe(88);
    expect(result.gradeLetter).toBe('A');
    expect(result.gradePoint).toBe(4.0);
    expect(result.remarks).toBe('Excellent');
  });

  it('should compute correct letter grade for Very Good (B)', () => {
    // CA1: 10, CA2: 10, Assignment: 8, Exam: 42 -> Total: 70
    const result = GradeCalculator.calculateSubjectGrade(10, 10, 8, 42);
    expect(result.totalScore).toBe(70);
    expect(result.gradeLetter).toBe('B');
    expect(result.gradePoint).toBe(3.0);
    expect(result.remarks).toBe('Very Good');
  });

  it('should compute correct letter grade for Credit (C) and Pass (D)', () => {
    const cResult = GradeCalculator.calculateSubjectGrade(8, 8, 6, 35); // 57
    expect(cResult.gradeLetter).toBe('C');
    expect(cResult.gradePoint).toBe(2.0);

    const dResult = GradeCalculator.calculateSubjectGrade(6, 6, 5, 28); // 45
    expect(dResult.gradeLetter).toBe('D');
    expect(dResult.gradePoint).toBe(1.0);
  });

  it('should compute Fail (F) for score below 40', () => {
    const fResult = GradeCalculator.calculateSubjectGrade(5, 5, 4, 20); // 34
    expect(fResult.gradeLetter).toBe('F');
    expect(fResult.gradePoint).toBe(0.0);
    expect(fResult.remarks).toBe('Fail');
  });

  it('should reject scores exceeding rubric component limits', () => {
    expect(() => GradeCalculator.calculateSubjectGrade(16, 10, 10, 50)).toThrow(/CA1 score must be between 0 and 15/);
    expect(() => GradeCalculator.calculateSubjectGrade(10, 10, 11, 50)).toThrow(/Assignment score must be between 0 and 10/);
    expect(() => GradeCalculator.calculateSubjectGrade(10, 10, 10, 65)).toThrow(/Exam score must be between 0 and 60/);
    expect(() => GradeCalculator.calculateSubjectGrade(-1, 10, 10, 50)).toThrow(/CA1 score must be between 0 and 15/);
  });

  it('should calculate weighted GPA accurately across subjects', () => {
    // Subject 1: 3 credits, Grade A (4.0) -> Quality Points = 12
    // Subject 2: 4 credits, Grade B (3.0) -> Quality Points = 12
    // Subject 3: 2 credits, Grade C (2.0) -> Quality Points = 4
    // Total Credits = 9, Total QP = 28 -> GPA = 28 / 9 = 3.11
    const gpa = GradeCalculator.calculateGPA([
      { creditUnits: 3, gradePoint: 4.0 },
      { creditUnits: 4, gradePoint: 3.0 },
      { creditUnits: 2, gradePoint: 2.0 }
    ]);
    expect(gpa).toBe(3.11);
  });

  it('should calculate standard class ranks with ties', () => {
    const students = [
      { studentId: 's1', totalAverage: 85 },
      { studentId: 's2', totalAverage: 92 },
      { studentId: 's3', totalAverage: 85 },
      { studentId: 's4', totalAverage: 70 }
    ];

    const ranks = GradeCalculator.calculateClassRanks(students);
    expect(ranks.get('s2')).toBe(1); // 92%
    expect(ranks.get('s1')).toBe(2); // 85% (tie)
    expect(ranks.get('s3')).toBe(2); // 85% (tie)
    expect(ranks.get('s4')).toBe(4); // 70% (rank skips to 4)
  });
});

/**
 * Assessment & Grading Engine for School Management System
 * Enforces valid scoring limits, component weightings, GPA mapping, and class rankings.
 */

export interface GradeRubric {
  ca1Max: number;        // Default 15
  ca2Max: number;        // Default 15
  assignmentMax: number; // Default 10
  examMax: number;       // Default 60
}

export const DEFAULT_RUBRIC: GradeRubric = {
  ca1Max: 15,
  ca2Max: 15,
  assignmentMax: 10,
  examMax: 60
};

export interface GradeCalculationResult {
  totalScore: number;
  gradeLetter: 'A' | 'B' | 'C' | 'D' | 'F';
  gradePoint: number;
  remarks: string;
}

export class GradeCalculator {
  /**
   * Validate individual assessment component scores against rubric maximums
   */
  public static validateScores(
    ca1: number,
    ca2: number,
    assignment: number,
    exam: number,
    rubric: GradeRubric = DEFAULT_RUBRIC
  ): void {
    if (ca1 < 0 || ca1 > rubric.ca1Max) {
      throw new Error(`CA1 score must be between 0 and ${rubric.ca1Max}. Received: ${ca1}`);
    }
    if (ca2 < 0 || ca2 > rubric.ca2Max) {
      throw new Error(`CA2 score must be between 0 and ${rubric.ca2Max}. Received: ${ca2}`);
    }
    if (assignment < 0 || assignment > rubric.assignmentMax) {
      throw new Error(`Assignment score must be between 0 and ${rubric.assignmentMax}. Received: ${assignment}`);
    }
    if (exam < 0 || exam > rubric.examMax) {
      throw new Error(`Exam score must be between 0 and ${rubric.examMax}. Received: ${exam}`);
    }
  }

  /**
   * Compute total score and map to standard academic scale
   * Scale:
   * 75 - 100: A (4.0 GPA) - Excellent
   * 65 - 74:  B (3.0 GPA) - Very Good
   * 50 - 64:  C (2.0 GPA) - Credit / Satisfactory
   * 40 - 49:  D (1.0 GPA) - Pass
   * 0  - 39:  F (0.0 GPA) - Fail
   */
  public static calculateSubjectGrade(
    ca1: number,
    ca2: number,
    assignment: number,
    exam: number,
    rubric: GradeRubric = DEFAULT_RUBRIC
  ): GradeCalculationResult {
    this.validateScores(ca1, ca2, assignment, exam, rubric);

    const totalScore = Math.round((ca1 + ca2 + assignment + exam) * 10) / 10;

    if (totalScore >= 75) {
      return { totalScore, gradeLetter: 'A', gradePoint: 4.0, remarks: 'Excellent' };
    } else if (totalScore >= 65) {
      return { totalScore, gradeLetter: 'B', gradePoint: 3.0, remarks: 'Very Good' };
    } else if (totalScore >= 50) {
      return { totalScore, gradeLetter: 'C', gradePoint: 2.0, remarks: 'Credit' };
    } else if (totalScore >= 40) {
      return { totalScore, gradeLetter: 'D', gradePoint: 1.0, remarks: 'Pass' };
    } else {
      return { totalScore, gradeLetter: 'F', gradePoint: 0.0, remarks: 'Fail' };
    }
  }

  /**
   * Calculate Weighted Grade Point Average (GPA) across all enrolled subjects
   * GPA = Sum(Credit Units * Grade Point) / Sum(Credit Units)
   */
  public static calculateGPA(
    scores: { creditUnits: number; gradePoint: number }[]
  ): number {
    if (!scores || scores.length === 0) return 0.0;

    let totalQualityPoints = 0;
    let totalCredits = 0;

    for (const item of scores) {
      const credits = item.creditUnits > 0 ? item.creditUnits : 1;
      totalQualityPoints += credits * item.gradePoint;
      totalCredits += credits;
    }

    if (totalCredits === 0) return 0.0;

    // Round to 2 decimal places
    return Math.round((totalQualityPoints / totalCredits) * 100) / 100;
  }

  /**
   * Compute standard academic class rank order (1st, 2nd, 3rd, ties share rank)
   */
  public static calculateClassRanks(
    students: { studentId: string; totalAverage: number }[]
  ): Map<string, number> {
    const ranks = new Map<string, number>();
    if (!students || students.length === 0) return ranks;

    // Sort descending by total average score
    const sorted = [...students].sort((a, b) => b.totalAverage - a.totalAverage);

    let currentRank = 1;
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].totalAverage < sorted[i - 1].totalAverage) {
        currentRank = i + 1;
      }
      ranks.set(sorted[i].studentId, currentRank);
    }

    return ranks;
  }

  /**
   * Derive automated headteacher / principal remark based on cumulative GPA
   */
  public static generatePrincipalRemark(gpa: number): string {
    if (gpa >= 3.7) return 'Outstanding academic performance. Demonstrates exemplary dedication and mastery.';
    if (gpa >= 3.0) return 'Commendable result. Very good conceptual understanding across core disciplines.';
    if (gpa >= 2.0) return 'Satisfactory effort. Has met standard requirements with room for improvement in weaker subjects.';
    if (gpa >= 1.0) return 'Marginal pass. Intensive academic tutoring and focused study recommended.';
    return 'Unsatisfactory performance. Mandatory academic intervention and parent-teacher conference required.';
  }
}

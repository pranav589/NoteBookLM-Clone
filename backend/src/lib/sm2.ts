export function calculateSM2(
  grade: number, // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
  previousEaseFactor: number = 2.5,
  previousInterval: number = 0, // in days
  previousRepetitions: number = 0
) {
  let easeFactor = previousEaseFactor;
  let interval = 0; // in days
  let repetitions = previousRepetitions;

  // Grade is mapped:
  // 1: Again (failed/forgot, reset repetitions)
  // 2: Hard (correct but barely remembered, scale down interval growth)
  // 3: Good (correct with normal effort)
  // 4: Easy (correct with zero effort)

  if (grade >= 2) {
    if (repetitions === 0) {
      interval = 1; // 1 day
    } else if (repetitions === 1) {
      interval = 3; // 3 days (tighter intervals for fast software learning)
    } else {
      interval = Math.ceil(previousInterval * easeFactor);
    }
    repetitions++;
  } else {
    // Reset reps on failure
    repetitions = 0;
    interval = 1; // repeat tomorrow
  }

  // Adjust Ease Factor: quality parameter in SM-2 is 0-5.
  // We map 1->1, 2->3, 3->4, 4->5 to compute ease factor adjustment
  const quality = grade === 1 ? 1 : grade + 1; // map 1..4 to 1..5
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  
  if (easeFactor < 1.3) {
    easeFactor = 1.3;
  }

  // Calculate due date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    easeFactor,
    interval,
    repetitions,
    nextReviewDate,
  };
}

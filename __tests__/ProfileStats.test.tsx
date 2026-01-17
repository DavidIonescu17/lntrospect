// This tests the logic used in your Profile Dashboard
// We recreate the logic functions here to verify they work correctly on raw data

// Mock badge calculator logic
const calculateStreak = (dates) => {
  if (dates.length === 0) return 0;
  // Sort dates
  const sortedDates = [...dates].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  let streak = 1;
  let maxStreak = 1;
  
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i-1]);
    const curr = new Date(sortedDates[i]);
    
    const diffTime = Math.abs(curr.getTime() - prev.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

    if (diffDays === 1) {
      streak++;
    } else if (diffDays > 1) {
      streak = 1; // Reset if gap is larger than 1 day
    }
    maxStreak = Math.max(streak, maxStreak);
  }
  return maxStreak;
};

const getMostFrequentMood = (entries) => {
  if (entries.length === 0) return 'None';
  const moodCounts = entries.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {});
  
  // Sort by count
  return Object.keys(moodCounts).sort((a, b) => moodCounts[b] - moodCounts[a])[0];
};

describe('Profile Logic & Stats', () => {

  describe('Streak Calculation', () => {
    it('calculates a 3-day streak correctly', () => {
      const dates = ['2023-01-01', '2023-01-02', '2023-01-03'];
      expect(calculateStreak(dates)).toBe(3);
    });

    it('resets streak if there is a gap', () => {
      // 1st & 2nd are consecutive, but 5th is a gap. Streak should break.
      const dates = ['2023-01-01', '2023-01-02', '2023-01-05'];
      expect(calculateStreak(dates)).toBe(2); // The longest streak was 2
    });

    it('returns 0 for empty logs', () => {
      expect(calculateStreak([])).toBe(0);
    });
  });

  describe('Mood Insights', () => {
    it('identifies the most frequent mood', () => {
      const entries = [
        { mood: 'happy' },
        { mood: 'sad' },
        { mood: 'happy' },
        { mood: 'anxious' }
      ];
      expect(getMostFrequentMood(entries)).toBe('happy');
    });

    it('returns "None" if no entries exist', () => {
      expect(getMostFrequentMood([])).toBe('None');
    });
  });
});
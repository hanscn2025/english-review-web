const INTERVAL_DAYS = [1, 3, 7, 14, 30, 60, 120];
const DAY_MS = 86400000;

function scheduleReview(current, rating, now) {
  const currentTime = now || new Date();
  if (rating === "again") {
    return {
      stage: Math.max(0, current.stage - 1),
      dueAt: new Date(currentTime.getTime() + 60000),
      lastRating: rating,
      reviewedAt: currentTime,
    };
  }
  const stage = Math.min(INTERVAL_DAYS.length - 1, current.stage + 1);
  return {
    stage,
    dueAt: new Date(currentTime.getTime() + INTERVAL_DAYS[current.stage] * DAY_MS),
    lastRating: rating,
    reviewedAt: currentTime,
  };
}

function dateKey(date) {
  const value = date || new Date();
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

module.exports = { INTERVAL_DAYS, scheduleReview, dateKey };

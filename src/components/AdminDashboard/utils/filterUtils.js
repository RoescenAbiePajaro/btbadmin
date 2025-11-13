export const filterByTime = (clicks, timeFilter, startDate, endDate) => {
  const normalizeDate = (date) => {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  };

  const now = new Date();
  const today = normalizeDate(now);
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() - today.getDay());
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const firstDayOfYear = new Date(now.getFullYear(), 0, 1);

  return clicks.filter(click => {
    const clickDate = normalizeDate(click.timestamp);
    
    switch(timeFilter) {
      case 'today':
        return clickDate.getTime() === today.getTime();
      case 'week':
        return clickDate >= firstDayOfWeek && clickDate <= today;
      case 'month':
        return clickDate >= firstDayOfMonth && clickDate <= today;
      case 'year':
        return clickDate >= firstDayOfYear && clickDate <= today;
      case 'custom':
        if (!startDate || !endDate) return true;
        const start = normalizeDate(startDate);
        const end = normalizeDate(endDate);
        end.setHours(23, 59, 59, 999);
        return clickDate >= start && clickDate <= end;
      default:
        return true;
    }
  });
};
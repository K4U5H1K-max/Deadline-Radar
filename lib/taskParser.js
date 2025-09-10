// Task parser for Deadline Radar
importScripts('https://unpkg.com/chrono-node@2.7.2/dist/chrono.min.js');

export function extractTasksAndDeadlines(text) {
  const actionVerbs = /\b(submit|register|apply|upload|complete|send|fill)\b/i;
  const lines = text.split(/\n|\. |! |\?/);
  let results = [];
  lines.forEach(line => {
    if (actionVerbs.test(line)) {
      const dates = chrono.parse(line);
      if (dates.length > 0) {
        results.push({
          title: line.replace(/by .*/, '').trim(),
          detail: line.trim(),
          deadline: dates[0].text,
          sourceUrl: window.location.href
        });
      }
    }
  });
  return results;
}

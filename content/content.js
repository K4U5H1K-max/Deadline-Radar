// Content script for Deadline Radar
// Scans visible text, detects deadlines and tasks

function getVisibleText() {
  let walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  let text = '';
  let node;
  while (node = walker.nextNode()) {
    text += node.textContent + '\n';
  }
  return text;
}

function extractTasksAndDeadlines(text) {
  const actionVerbs = /\b(submit|register|apply|upload|complete|send|fill)\b/i;
  // Simple date regex: matches formats like "Oct 15", "2025-09-10", "10/15/2025"
  const dateRegex = /(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[ .,-]*\d{1,2}(?:[ .,-]*\d{2,4})?|\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b)/i;
  const lines = text.split(/\n|\. |! |\?/);
  let results = [];
  for (let i = 0; i < lines.length && results.length < 5; i++) {
    const line = lines[i];
    if (actionVerbs.test(line)) {
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        // Use dayjs to parse the date
        const parsedDate = dayjs(dateMatch[0]);
        if (parsedDate.isValid()) {
          results.push({
            title: line.replace(/by .*/, '').trim(),
            detail: line.trim(),
            deadline: parsedDate.format('YYYY-MM-DD'),
            sourceUrl: window.location.href
          });
        }
      }
    }
  }
  console.log('[Deadline Radar] Detected tasks:', results);
  return results;
}

function sendTasksToPopup(tasks) {
  console.log('[Deadline Radar] Sending tasks to popup:', tasks);
  chrome.runtime.sendMessage({ type: 'DEADLINE_RADAR_TASKS', tasks });
}


(function() {
  try {
    const text = getVisibleText();
    console.log('[Deadline Radar] Visible text:', text);
    const tasks = extractTasksAndDeadlines(text);
    sendTasksToPopup(tasks);
  } catch (e) {
    console.error('[Deadline Radar] Error:', e);
    chrome.runtime.sendMessage({ type: 'DEADLINE_RADAR_ERROR', error: e.message });
  }
})();

// Listen for popup requests
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'DEADLINE_RADAR_REQUEST') {
    try {
      const text = getVisibleText();
      console.log('[Deadline Radar] Visible text (on request):', text);
      const tasks = extractTasksAndDeadlines(text);
      sendTasksToPopup(tasks);
    } catch (e) {
      console.error('[Deadline Radar] Error (on request):', e);
      chrome.runtime.sendMessage({ type: 'DEADLINE_RADAR_ERROR', error: e.message });
    }
  }
});

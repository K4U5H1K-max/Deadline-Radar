// Background script for Deadline Radar
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'DEADLINE_RADAR_SAVE') {
    saveTask(msg.task);
  }
  if (msg.type === 'DEADLINE_RADAR_UNSAVE') {
    unsaveTask(msg.task);
  }
});

function saveTask(task) {
  chrome.storage.local.get(['tasks'], (result) => {
    let tasks = result.tasks || [];
    // Check for duplicate by title and deadline
    const exists = tasks.some(t => t.title === task.title && t.deadline === task.deadline);
    if (exists) return; // Do not add duplicate
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    const newTask = {
      ...task,
      id,
      status: 'Not Started',
      createdAt: Date.now()
    };
    chrome.storage.local.set({ tasks: [...tasks, newTask] });
  });
}

function unsaveTask(task) {
  chrome.storage.local.get(['tasks'], (result) => {
    let tasks = result.tasks || [];
    // Remove by title and deadline
    tasks = tasks.filter(t => !(t.title === task.title && t.deadline === task.deadline));
    chrome.storage.local.set({ tasks });
  });
}

function notify(type, tasks) {
  if (type === 'digest') {
    const upcoming = tasks.filter(t => new Date(t.deadline) - Date.now() < 7 * 24 * 60 * 60 * 1000);
    if (upcoming.length > 0) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon128.png',
        title: 'Upcoming Deadlines',
        message: upcoming.map(t => `${t.title}: ${t.deadline}`).join('\n')
      });
    }
  } else if (type === 'lastcall') {
    const soon = tasks.filter(t => new Date(t.deadline) - Date.now() < 24 * 60 * 60 * 1000);
    soon.forEach(t => {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icon128.png',
        title: 'Last Call!',
        message: `${t.title} is due in less than 24 hours!`
      });
    });
  }
}

// Daily digest notification
setInterval(() => {
  chrome.storage.local.get(['tasks'], (result) => {
    notify('digest', result.tasks || []);
    notify('lastcall', result.tasks || []);
  });
}, 60 * 60 * 1000); // every hour

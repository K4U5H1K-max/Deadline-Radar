// Storage utilities for Deadline Radar
export function saveTask(task) {
  chrome.storage.local.get(['tasks'], (result) => {
    const tasks = result.tasks || [];
    chrome.storage.local.set({ tasks: [...tasks, task] });
  });
}

export function getTasks(callback) {
  chrome.storage.local.get(['tasks'], (result) => {
    callback(result.tasks || []);
  });
}

export function updateTaskStatus(id, status, callback) {
  chrome.storage.local.get(['tasks'], (result) => {
    let tasks = result.tasks || [];
    tasks = tasks.map(t => t.id === id ? { ...t, status } : t);
    chrome.storage.local.set({ tasks }, () => callback(tasks));
  });
}

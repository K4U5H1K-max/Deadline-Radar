// Popup JS for Deadline Radar
function urgencyColor(deadline) {
  const now = new Date();
  const date = new Date(deadline);
  const diff = (date - now) / (1000 * 60 * 60 * 24);
  if (diff < 3) return 'bg-red-100 border-red-500';
  if (diff < 7) return 'bg-yellow-100 border-yellow-500';
  return 'bg-green-100 border-green-500';
}

function renderTasks(tasks) {
  const container = document.getElementById('tasks');
  container.innerHTML = '';
  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<div class="text-gray-500">No tasks or deadlines found.</div>';
    return;
  }
  // Get saved tasks to check for duplicates
  chrome.storage.local.get(['tasks'], (result) => {
    const saved = result.tasks || [];
    tasks.forEach(task => {
      const isSaved = saved.some(t => t.title === task.title && t.deadline === task.deadline);
      const div = document.createElement('div');
      div.className = `border-l-4 p-2 ${urgencyColor(task.deadline)}`;
      div.innerHTML = `<div class='font-semibold'>${task.title}</div>
        <div class='text-sm text-gray-700'>${task.detail}</div>
        <div class='text-xs text-gray-500'>Deadline: ${task.deadline}</div>
        <button class='mt-2 px-2 py-1 ${isSaved ? 'bg-gray-400' : 'bg-blue-500'} text-white rounded save-btn'>${isSaved ? 'Unsave' : 'Save'}</button>`;
      div.querySelector('.save-btn').onclick = () => {
        if (isSaved) {
          unsaveTask(task);
        } else {
          saveTask(task);
        }
        // Re-render after action
        setTimeout(() => {
          renderTasks(tasks);
        }, 300);
      };
      container.appendChild(div);
    });
  });
}

function saveTask(task) {
  chrome.runtime.sendMessage({ type: 'DEADLINE_RADAR_SAVE', task });
}

function unsaveTask(task) {
  chrome.runtime.sendMessage({ type: 'DEADLINE_RADAR_UNSAVE', task });
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'DEADLINE_RADAR_TASKS') {
    renderTasks(msg.tasks);
  }
});

document.getElementById('dashboardBtn').onclick = () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
};

// Request tasks from content script
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { type: 'DEADLINE_RADAR_REQUEST' });
});

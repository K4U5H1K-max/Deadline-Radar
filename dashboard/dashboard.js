// Dashboard JS for Deadline Radar
function urgencyColor(deadline) {
  const now = new Date();
  const date = new Date(deadline);
  const diff = (date - now) / (1000 * 60 * 60 * 24);
  if (diff < 3) return 'bg-red-100 border-red-500';
  if (diff < 7) return 'bg-yellow-100 border-yellow-500';
  return 'bg-green-100 border-green-500';
}

function countdown(deadline) {
  const now = new Date();
  const date = new Date(deadline);
  const diff = date - now;
  if (diff <= 0) return 'Due!';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  return `${days}d ${hours}h`;
}

function renderTimeline(tasks) {
  const container = document.getElementById('timeline');
  container.innerHTML = '';
  if (!tasks || tasks.length === 0) {
    container.innerHTML = '<div class="text-gray-500">No saved tasks.</div>';
    return;
  }
  tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  tasks.forEach(task => {
    const div = document.createElement('div');
    div.className = `border-l-4 p-4 ${urgencyColor(task.deadline)}`;
    div.innerHTML = `<div class='font-semibold'>${task.title}</div>
      <div class='text-sm text-gray-700'>${task.detail}</div>
      <div class='text-xs text-gray-500'>Deadline: ${task.deadline} | <span class='font-bold'>${countdown(task.deadline)}</span></div>
      <div class='text-xs text-gray-400'>Source: <a href='${task.sourceUrl}' target='_blank' class='underline'>${task.sourceUrl}</a></div>
      <select class='mt-2 status-select'>
        <option value='Not Started' ${task.status==='Not Started'?'selected':''}>Not Started</option>
        <option value='In Progress' ${task.status==='In Progress'?'selected':''}>In Progress</option>
        <option value='Completed' ${task.status==='Completed'?'selected':''}>Completed</option>
      </select>`;
    div.querySelector('.status-select').onchange = (e) => updateStatus(task.id, e.target.value);
    container.appendChild(div);
  });
}

function updateStatus(id, status) {
  chrome.storage.local.get(['tasks'], (result) => {
    let tasks = result.tasks || [];
    tasks = tasks.map(t => t.id === id ? { ...t, status } : t);
    chrome.storage.local.set({ tasks }, () => renderTimeline(tasks));
  });
}

function loadTasks() {
  chrome.storage.local.get(['tasks'], (result) => {
    renderTimeline(result.tasks || []);
  });
}

document.addEventListener('DOMContentLoaded', loadTasks);

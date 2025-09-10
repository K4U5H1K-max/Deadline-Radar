// Popup script for Deadline Radar

class PopupManager {
  constructor() {
    this.currentPageTasks = [];
    this.allTasks = [];
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadTasks();
  }

  setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.refreshCurrentPage();
    });

    // Dashboard button
    document.getElementById('dashboardBtn').addEventListener('click', () => {
      this.openDashboard();
    });

    // View all button
    document.getElementById('viewAllBtn').addEventListener('click', () => {
      this.openDashboard();
    });
  }

  async loadTasks() {
    try {
      // Get current page tasks
      await this.getCurrentPageTasks();
      
      // Get all stored tasks
      await this.getAllStoredTasks();
      
      // Update UI
      this.updateUI();
      
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.showError('Failed to load tasks');
    }
  }

  async getCurrentPageTasks() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'getDetectedTasks' }, (response) => {
            if (chrome.runtime.lastError) {
              console.log('No content script available on this page');
              this.currentPageTasks = [];
            } else if (response && response.tasks) {
              this.currentPageTasks = response.tasks;
            } else {
              this.currentPageTasks = [];
            }
            resolve();
          });
        } else {
          this.currentPageTasks = [];
          resolve();
        }
      });
    });
  }

  async getAllStoredTasks() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getAllTasks' }, (response) => {
        if (response && response.tasks) {
          this.allTasks = response.tasks;
        } else {
          this.allTasks = [];
        }
        resolve();
      });
    });
  }

  async refreshCurrentPage() {
    const refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.classList.add('animate-spin');
    
    try {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, { action: 'redetect' }, (response) => {
            if (response && response.tasks) {
              this.currentPageTasks = response.tasks;
              this.updateCurrentPageTasks();
            }
            refreshBtn.classList.remove('animate-spin');
          });
        }
      });
    } catch (error) {
      console.error('Error refreshing:', error);
      refreshBtn.classList.remove('animate-spin');
    }
  }

  updateUI() {
    this.updateCurrentPageTasks();
    this.updateQuickStats();
    this.updateRecentTasks();
  }

  updateCurrentPageTasks() {
    const container = document.getElementById('currentPageTasks');
    const noTasksDiv = document.getElementById('noCurrentTasks');
    const countElement = document.getElementById('currentPageCount');

    // Update count
    countElement.textContent = `${this.currentPageTasks.length} task${this.currentPageTasks.length !== 1 ? 's' : ''}`;

    if (this.currentPageTasks.length === 0) {
      noTasksDiv.style.display = 'block';
      container.innerHTML = '';
      container.appendChild(noTasksDiv);
    } else {
      noTasksDiv.style.display = 'none';
      container.innerHTML = '';
      
      this.currentPageTasks.forEach(task => {
        const taskElement = this.createTaskElement(task, true);
        container.appendChild(taskElement);
      });
    }
  }

  updateQuickStats() {
    const now = new Date();
    const urgent = this.allTasks.filter(task => {
      const deadline = new Date(task.deadline);
      return task.status !== 'completed' && deadline.getTime() - now.getTime() < 24 * 60 * 60 * 1000;
    }).length;

    const today = this.allTasks.filter(task => {
      const deadline = new Date(task.deadline);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      return task.status !== 'completed' && 
             deadline >= todayStart && 
             deadline <= todayEnd;
    }).length;

    const total = this.allTasks.filter(task => task.status !== 'completed').length;

    document.getElementById('urgentCount').textContent = urgent;
    document.getElementById('todayCount').textContent = today;
    document.getElementById('totalCount').textContent = total;
  }

  updateRecentTasks() {
    const container = document.getElementById('recentTasks');
    container.innerHTML = '';

    // Sort tasks by deadline (closest first) and take top 5
    const recentTasks = this.allTasks
      .filter(task => task.status !== 'completed')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);

    if (recentTasks.length === 0) {
      container.innerHTML = `
        <div class="text-center text-gray-500 text-sm py-4">
          <p>No active tasks</p>
          <p class="text-xs mt-1">Save tasks from web pages to see them here</p>
        </div>
      `;
    } else {
      recentTasks.forEach(task => {
        const taskElement = this.createTaskElement(task, false);
        container.appendChild(taskElement);
      });
    }
  }

  createTaskElement(task, isCurrentPage = false) {
    const template = document.getElementById('taskTemplate');
    const taskElement = template.content.cloneNode(true);

    // Set task data
    taskElement.querySelector('.task-title').textContent = task.title || 'Untitled Task';
    taskElement.querySelector('.task-description').textContent = task.description || '';
    
    // Set priority styling
    const priorityColors = {
      'urgent': 'bg-red-100 text-red-800 border-red-500',
      'high': 'bg-orange-100 text-orange-800 border-orange-500',
      'medium': 'bg-yellow-100 text-yellow-800 border-yellow-500',
      'low': 'bg-green-100 text-green-800 border-green-500',
      'overdue': 'bg-gray-100 text-gray-800 border-gray-500'
    };

    const taskCard = taskElement.querySelector('.task-card');
    const priorityClass = priorityColors[task.priority] || priorityColors['low'];
    taskCard.className += ' ' + priorityClass;

    // Set countdown
    const countdown = this.getCountdownText(task.deadline);
    const countdownElement = taskElement.querySelector('.task-countdown');
    countdownElement.textContent = countdown.text;
    countdownElement.className += ' ' + countdown.class;

    // Set priority badge
    const priorityElement = taskElement.querySelector('.task-priority');
    priorityElement.textContent = task.priority.toUpperCase();
    priorityElement.className += ` ${priorityClass}`;

    // Event listeners
    const saveBtn = taskElement.querySelector('.save-btn');
    const completeBtn = taskElement.querySelector('.complete-btn');

    if (isCurrentPage) {
      // Save button for current page tasks
      saveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.saveTask(task);
      });
    } else {
      // Hide save button for already saved tasks
      saveBtn.style.display = 'none';
    }

    completeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.markTaskComplete(task.id);
    });

    // Click to view task details
    taskCard.addEventListener('click', () => {
      this.showTaskDetails(task);
    });

    return taskElement;
  }

  getCountdownText(deadline) {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();
    
    if (timeDiff < 0) {
      return { text: 'Overdue', class: 'text-red-600' };
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return { 
        text: `${days}d ${hours}h`, 
        class: days <= 1 ? 'text-red-600' : days <= 3 ? 'text-orange-600' : 'text-green-600' 
      };
    } else if (hours > 0) {
      return { 
        text: `${hours}h ${minutes}m`, 
        class: hours <= 6 ? 'text-red-600' : 'text-orange-600' 
      };
    } else {
      return { 
        text: `${minutes}m`, 
        class: 'text-red-600' 
      };
    }
  }

  async saveTask(task) {
    try {
      chrome.runtime.sendMessage({ 
        action: 'saveTask', 
        task: task 
      }, (response) => {
        if (response && response.success) {
          this.showSuccess('Task saved!');
          this.loadTasks(); // Refresh the UI
        } else {
          this.showError('Failed to save task');
        }
      });
    } catch (error) {
      console.error('Error saving task:', error);
      this.showError('Failed to save task');
    }
  }

  async markTaskComplete(taskId) {
    try {
      chrome.runtime.sendMessage({ 
        action: 'updateTask', 
        taskId: taskId,
        updates: { status: 'completed', completedAt: new Date().toISOString() }
      }, (response) => {
        if (response && response.success) {
          this.showSuccess('Task completed!');
          this.loadTasks(); // Refresh the UI
        } else {
          this.showError('Failed to update task');
        }
      });
    } catch (error) {
      console.error('Error updating task:', error);
      this.showError('Failed to update task');
    }
  }

  showTaskDetails(task) {
    // For now, just open the source URL
    chrome.tabs.create({ url: task.url });
  }

  openDashboard() {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  }

  showSuccess(message) {
    this.showToast(message, 'success');
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  showToast(message, type) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-3 rounded shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});
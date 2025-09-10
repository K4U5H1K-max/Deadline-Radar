// Dashboard script for Deadline Radar

class DashboardManager {
  constructor() {
    this.tasks = [];
    this.currentFilter = 'all';
    this.countdownIntervals = new Map();
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadTasks();
    this.startCountdownUpdates();
  }

  setupEventListeners() {
    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
      this.loadTasks();
    });

    // Add task buttons
    document.getElementById('addTaskBtn').addEventListener('click', () => {
      this.showAddTaskModal();
    });

    document.getElementById('addTaskEmptyBtn').addEventListener('click', () => {
      this.showAddTaskModal();
    });

    // Add task form
    document.getElementById('addTaskForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addNewTask();
    });

    document.getElementById('cancelAddTask').addEventListener('click', () => {
      this.hideAddTaskModal();
    });

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        const filter = e.target.getAttribute('data-filter');
        this.setFilter(filter);
      });
    });

    // Modal backdrop click
    document.getElementById('addTaskModal').addEventListener('click', (e) => {
      if (e.target.id === 'addTaskModal') {
        this.hideAddTaskModal();
      }
    });
  }

  async loadTasks() {
    try {
      chrome.runtime.sendMessage({ action: 'getAllTasks' }, (response) => {
        if (response && response.tasks) {
          this.tasks = response.tasks;
          this.updateStats();
          this.renderTasks();
        } else {
          console.error('Failed to load tasks');
          this.tasks = [];
          this.updateStats();
          this.renderTasks();
        }
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.tasks = [];
      this.updateStats();
      this.renderTasks();
    }
  }

  updateStats() {
    const now = new Date();
    
    const urgent = this.tasks.filter(task => {
      if (task.status === 'completed') return false;
      const deadline = new Date(task.deadline);
      const timeDiff = deadline.getTime() - now.getTime();
      return timeDiff < 24 * 60 * 60 * 1000; // Less than 24 hours
    }).length;

    const dueToday = this.tasks.filter(task => {
      if (task.status === 'completed') return false;
      const deadline = new Date(task.deadline);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      return deadline >= todayStart && deadline <= todayEnd;
    }).length;

    const active = this.tasks.filter(task => task.status !== 'completed').length;
    const completed = this.tasks.filter(task => task.status === 'completed').length;

    document.getElementById('urgentCountDashboard').textContent = urgent;
    document.getElementById('todayCountDashboard').textContent = dueToday;
    document.getElementById('activeCountDashboard').textContent = active;
    document.getElementById('completedCountDashboard').textContent = completed;
  }

  setFilter(filter) {
    this.currentFilter = filter;
    
    // Update active tab
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.classList.remove('active', 'border-blue-500', 'text-blue-600');
      tab.classList.add('border-transparent', 'text-gray-500');
    });
    
    const activeTab = document.querySelector(`[data-filter="${filter}"]`);
    activeTab.classList.remove('border-transparent', 'text-gray-500');
    activeTab.classList.add('active', 'border-blue-500', 'text-blue-600');

    this.renderTasks();
  }

  renderTasks() {
    const container = document.getElementById('tasksContainer');
    const emptyState = document.getElementById('emptyState');
    
    // Clear existing intervals
    this.countdownIntervals.forEach(interval => clearInterval(interval));
    this.countdownIntervals.clear();

    // Filter tasks based on current filter
    const filteredTasks = this.getFilteredTasks();

    if (filteredTasks.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('hidden');
    } else {
      emptyState.classList.add('hidden');
      container.innerHTML = '';
      
      // Sort tasks by deadline (closest first)
      const sortedTasks = filteredTasks.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (b.status === 'completed' && a.status !== 'completed') return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      });

      sortedTasks.forEach(task => {
        const taskElement = this.createTaskCard(task);
        container.appendChild(taskElement);
      });
    }
  }

  getFilteredTasks() {
    const now = new Date();
    
    switch (this.currentFilter) {
      case 'urgent':
        return this.tasks.filter(task => {
          if (task.status === 'completed') return false;
          const deadline = new Date(task.deadline);
          const timeDiff = deadline.getTime() - now.getTime();
          return timeDiff < 24 * 60 * 60 * 1000;
        });
        
      case 'today':
        return this.tasks.filter(task => {
          if (task.status === 'completed') return false;
          const deadline = new Date(task.deadline);
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEnd = new Date();
          todayEnd.setHours(23, 59, 59, 999);
          
          return deadline >= todayStart && deadline <= todayEnd;
        });
        
      case 'pending':
        return this.tasks.filter(task => task.status !== 'completed');
        
      case 'completed':
        return this.tasks.filter(task => task.status === 'completed');
        
      default:
        return this.tasks;
    }
  }

  createTaskCard(task) {
    const template = document.getElementById('taskCardTemplate');
    const taskElement = template.content.cloneNode(true);

    // Set basic task info
    taskElement.querySelector('.task-title').textContent = task.title || 'Untitled Task';
    taskElement.querySelector('.task-description').textContent = task.description || '';
    
    // Set deadline text
    const deadlineDate = new Date(task.deadline);
    taskElement.querySelector('.task-deadline-text').textContent = 
      `Due: ${deadlineDate.toLocaleDateString()} at ${deadlineDate.toLocaleTimeString()}`;

    // Set priority indicator and badge
    const priorityColors = {
      'urgent': { bg: 'bg-red-500', text: 'bg-red-100 text-red-800' },
      'high': { bg: 'bg-orange-500', text: 'bg-orange-100 text-orange-800' },
      'medium': { bg: 'bg-yellow-500', text: 'bg-yellow-100 text-yellow-800' },
      'low': { bg: 'bg-green-500', text: 'bg-green-100 text-green-800' },
      'overdue': { bg: 'bg-gray-500', text: 'bg-gray-100 text-gray-800' }
    };

    const priority = task.priority || 'low';
    const priorityConfig = priorityColors[priority] || priorityColors['low'];
    
    taskElement.querySelector('.task-priority-indicator').className += ` ${priorityConfig.bg}`;
    const priorityBadge = taskElement.querySelector('.task-priority-badge');
    priorityBadge.textContent = priority.toUpperCase();
    priorityBadge.className += ` ${priorityConfig.text}`;

    // Set status badge
    const statusBadge = taskElement.querySelector('.task-status-badge');
    if (task.status === 'completed') {
      statusBadge.textContent = 'COMPLETED';
      statusBadge.className += ' bg-green-100 text-green-800';
    } else {
      statusBadge.textContent = 'ACTIVE';
      statusBadge.className += ' bg-blue-100 text-blue-800';
    }

    // Set source link
    const sourceLink = taskElement.querySelector('.task-source-link');
    if (task.url) {
      sourceLink.href = task.url;
      sourceLink.textContent = task.pageTitle || task.url;
    } else {
      sourceLink.textContent = 'Manual Entry';
      sourceLink.removeAttribute('href');
    }

    // Set up countdown
    const countdownElement = taskElement.querySelector('.countdown-large');
    this.updateCountdown(task, countdownElement);
    
    // Set up countdown interval
    const intervalId = setInterval(() => {
      this.updateCountdown(task, countdownElement);
    }, 1000);
    this.countdownIntervals.set(task.id, intervalId);

    // Event listeners
    const editBtn = taskElement.querySelector('.edit-task-btn');
    const deleteBtn = taskElement.querySelector('.delete-task-btn');
    const completeBtn = taskElement.querySelector('.complete-task-btn');

    editBtn.addEventListener('click', () => this.editTask(task));
    deleteBtn.addEventListener('click', () => this.deleteTask(task.id));
    
    if (task.status === 'completed') {
      completeBtn.textContent = 'Completed';
      completeBtn.disabled = true;
      completeBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
      completeBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
    } else {
      completeBtn.addEventListener('click', () => this.completeTask(task.id));
    }

    return taskElement;
  }

  updateCountdown(task, countdownElement) {
    const now = new Date();
    const deadline = new Date(task.deadline);
    const timeDiff = deadline.getTime() - now.getTime();

    if (task.status === 'completed') {
      countdownElement.textContent = '✓ Completed';
      countdownElement.className = 'countdown-large text-green-600';
      return;
    }

    if (timeDiff < 0) {
      const overdueDiff = Math.abs(timeDiff);
      const days = Math.floor(overdueDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((overdueDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      countdownElement.textContent = `Overdue by ${days}d ${hours}h`;
      countdownElement.className = 'countdown-large text-red-600 pulse-animation';
      return;
    }

    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

    let countdownText = '';
    let colorClass = '';

    if (days > 0) {
      countdownText = `${days}d ${hours}h ${minutes}m`;
      colorClass = days <= 1 ? 'text-red-600' : days <= 3 ? 'text-orange-600' : 'text-blue-600';
    } else if (hours > 0) {
      countdownText = `${hours}h ${minutes}m ${seconds}s`;
      colorClass = hours <= 6 ? 'text-red-600' : 'text-orange-600';
    } else {
      countdownText = `${minutes}m ${seconds}s`;
      colorClass = 'text-red-600 pulse-animation';
    }

    countdownElement.textContent = countdownText;
    countdownElement.className = `countdown-large ${colorClass}`;
  }

  showAddTaskModal() {
    document.getElementById('addTaskModal').classList.remove('hidden');
    document.getElementById('taskTitle').focus();
  }

  hideAddTaskModal() {
    document.getElementById('addTaskModal').classList.add('hidden');
    document.getElementById('addTaskForm').reset();
  }

  async addNewTask() {
    const form = document.getElementById('addTaskForm');
    const formData = new FormData(form);
    
    const task = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      title: document.getElementById('taskTitle').value,
      description: document.getElementById('taskDescription').value,
      deadline: new Date(document.getElementById('taskDeadline').value).toISOString(),
      priority: document.getElementById('taskPriority').value,
      status: 'pending',
      url: null,
      pageTitle: null,
      context: 'Manual entry',
      detected: new Date().toISOString(),
      tags: ['manual']
    };

    try {
      chrome.runtime.sendMessage({ 
        action: 'saveTask', 
        task: task 
      }, (response) => {
        if (response && response.success) {
          this.hideAddTaskModal();
          this.loadTasks();
          this.showToast('Task added successfully!', 'success');
        } else {
          this.showToast('Failed to add task', 'error');
        }
      });
    } catch (error) {
      console.error('Error adding task:', error);
      this.showToast('Failed to add task', 'error');
    }
  }

  async editTask(task) {
    // For now, just show an alert - can be enhanced with a proper edit modal
    const newTitle = prompt('Edit task title:', task.title);
    if (newTitle && newTitle !== task.title) {
      try {
        chrome.runtime.sendMessage({ 
          action: 'updateTask', 
          taskId: task.id,
          updates: { title: newTitle }
        }, (response) => {
          if (response && response.success) {
            this.loadTasks();
            this.showToast('Task updated!', 'success');
          } else {
            this.showToast('Failed to update task', 'error');
          }
        });
      } catch (error) {
        console.error('Error updating task:', error);
        this.showToast('Failed to update task', 'error');
      }
    }
  }

  async deleteTask(taskId) {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        chrome.runtime.sendMessage({ 
          action: 'deleteTask', 
          taskId: taskId 
        }, (response) => {
          if (response && response.success) {
            this.loadTasks();
            this.showToast('Task deleted!', 'success');
          } else {
            this.showToast('Failed to delete task', 'error');
          }
        });
      } catch (error) {
        console.error('Error deleting task:', error);
        this.showToast('Failed to delete task', 'error');
      }
    }
  }

  async completeTask(taskId) {
    try {
      chrome.runtime.sendMessage({ 
        action: 'updateTask', 
        taskId: taskId,
        updates: { 
          status: 'completed', 
          completedAt: new Date().toISOString() 
        }
      }, (response) => {
        if (response && response.success) {
          this.loadTasks();
          this.showToast('Task completed!', 'success');
        } else {
          this.showToast('Failed to complete task', 'error');
        }
      });
    } catch (error) {
      console.error('Error completing task:', error);
      this.showToast('Failed to complete task', 'error');
    }
  }

  startCountdownUpdates() {
    // Update stats every minute
    setInterval(() => {
      this.updateStats();
    }, 60000);
  }

  showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
    }`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3000);
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DashboardManager();
});
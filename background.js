// Background script for Deadline Radar - handles notifications and enhanced date parsing

// Import chrono-node for better date parsing (will be bundled)
// For now, we'll use built-in Date parsing and enhance it

class BackgroundTaskManager {
  constructor() {
    this.init();
  }

  init() {
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Set up periodic notifications check
    this.setupNotificationAlarms();
    
    // Handle alarm events
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'checkDeadlines') {
        this.checkUpcomingDeadlines();
      }
    });

    console.log('Deadline Radar background script initialized');
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      switch (request.action) {
        case 'tasksDetected':
          await this.processDetectedTasks(request.tasks, request.url, request.title);
          sendResponse({ success: true });
          break;

        case 'getAllTasks':
          const tasks = await this.getAllTasks();
          sendResponse({ tasks });
          break;

        case 'saveTask':
          await this.saveTask(request.task);
          sendResponse({ success: true });
          break;

        case 'updateTask':
          await this.updateTask(request.taskId, request.updates);
          sendResponse({ success: true });
          break;

        case 'deleteTask':
          await this.deleteTask(request.taskId);
          sendResponse({ success: true });
          break;

        case 'enhanceDateParsing':
          const enhancedTasks = await this.enhanceDateParsing(request.tasks);
          sendResponse({ tasks: enhancedTasks });
          break;

        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background script error:', error);
      sendResponse({ error: error.message });
    }
  }

  async processDetectedTasks(tasks, url, pageTitle) {
    // Enhance date parsing for detected tasks
    const enhancedTasks = await this.enhanceDateParsing(tasks);
    
    // Store enhanced tasks
    for (const task of enhancedTasks) {
      // Check if task already exists (avoid duplicates)
      const existingTasks = await this.getAllTasks();
      const duplicate = existingTasks.find(existing => 
        existing.url === task.url && 
        existing.description === task.description &&
        Math.abs(new Date(existing.deadline) - new Date(task.deadline)) < 24 * 60 * 60 * 1000 // Within 24 hours
      );

      if (!duplicate) {
        await this.saveTask(task);
      }
    }

    // Show notification if urgent tasks detected
    const urgentTasks = enhancedTasks.filter(task => task.priority === 'urgent');
    if (urgentTasks.length > 0) {
      this.showNotification(
        'Urgent Deadlines Detected!',
        `Found ${urgentTasks.length} urgent deadline(s) on ${pageTitle}`,
        'urgent'
      );
    }
  }

  async enhanceDateParsing(tasks) {
    // Enhanced date parsing using more sophisticated logic
    // In a real implementation, we'd use chrono-node here
    return tasks.map(task => {
      const enhancedDate = this.parseWithContext(task.dateString, task.context);
      if (enhancedDate) {
        task.deadline = enhancedDate.toISOString();
        task.priority = this.calculatePriority(enhancedDate);
      }
      return task;
    });
  }

  parseWithContext(dateStr, context) {
    try {
      // Enhanced date parsing logic
      const cleanStr = dateStr.replace(/(\d+)(st|nd|rd|th)/g, '$1').trim();
      
      // Handle relative dates
      const relativePatterns = {
        'tomorrow': 1,
        'next week': 7,
        'next month': 30,
        'end of week': this.getDaysUntilEndOfWeek(),
        'end of month': this.getDaysUntilEndOfMonth()
      };

      for (const [phrase, days] of Object.entries(relativePatterns)) {
        if (context.toLowerCase().includes(phrase) || cleanStr.toLowerCase().includes(phrase)) {
          const date = new Date();
          date.setDate(date.getDate() + days);
          return date;
        }
      }

      // Handle time specifications
      const timeMatch = context.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
      let hours = 0, minutes = 0;
      
      if (timeMatch) {
        hours = parseInt(timeMatch[1]);
        minutes = parseInt(timeMatch[2]);
        if (timeMatch[3] && timeMatch[3].toLowerCase() === 'pm' && hours < 12) {
          hours += 12;
        }
      }

      // Try to parse the date string
      const date = new Date(cleanStr);
      if (!isNaN(date.getTime())) {
        // Set time if specified
        if (timeMatch) {
          date.setHours(hours, minutes, 0, 0);
        }
        
        // If year is not specified and date is in the past, assume next year
        if (date.getFullYear() === new Date().getFullYear() && date < new Date()) {
          date.setFullYear(date.getFullYear() + 1);
        }
        
        return date;
      }

      return null;
    } catch (error) {
      console.error('Date parsing error:', error);
      return null;
    }
  }

  getDaysUntilEndOfWeek() {
    const today = new Date().getDay(); // 0 = Sunday, 6 = Saturday
    return 7 - today; // Days until Sunday
  }

  getDaysUntilEndOfMonth() {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.ceil((lastDay - now) / (1000 * 60 * 60 * 24));
  }

  calculatePriority(deadline) {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    if (daysDiff < 0) return 'overdue';
    if (daysDiff < 1) return 'urgent';
    if (daysDiff < 3) return 'high';
    if (daysDiff < 7) return 'medium';
    return 'low';
  }

  async getAllTasks() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['tasks'], (result) => {
        resolve(result.tasks || []);
      });
    });
  }

  async saveTask(task) {
    const tasks = await this.getAllTasks();
    tasks.push(task);
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ tasks }, () => {
        resolve();
      });
    });
  }

  async updateTask(taskId, updates) {
    const tasks = await this.getAllTasks();
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      
      return new Promise((resolve) => {
        chrome.storage.local.set({ tasks }, () => {
          resolve();
        });
      });
    }
  }

  async deleteTask(taskId) {
    const tasks = await this.getAllTasks();
    const filteredTasks = tasks.filter(task => task.id !== taskId);
    
    return new Promise((resolve) => {
      chrome.storage.local.set({ tasks: filteredTasks }, () => {
        resolve();
      });
    });
  }

  setupNotificationAlarms() {
    // Clear existing alarms
    chrome.alarms.clear('checkDeadlines');
    
    // Set up recurring alarm to check deadlines every hour
    chrome.alarms.create('checkDeadlines', {
      delayInMinutes: 60,
      periodInMinutes: 60
    });
  }

  async checkUpcomingDeadlines() {
    const tasks = await this.getAllTasks();
    const now = new Date();
    
    // Check for upcoming deadlines
    tasks.forEach(task => {
      if (task.status === 'completed') return;
      
      const deadline = new Date(task.deadline);
      const timeDiff = deadline.getTime() - now.getTime();
      const hoursDiff = timeDiff / (1000 * 3600);
      
      // Notify for deadlines within 24 hours
      if (hoursDiff > 0 && hoursDiff <= 24) {
        let message = '';
        if (hoursDiff <= 1) {
          message = `Due in less than 1 hour!`;
        } else if (hoursDiff <= 6) {
          message = `Due in ${Math.ceil(hoursDiff)} hours`;
        } else {
          message = `Due tomorrow`;
        }
        
        this.showNotification(
          `Deadline Reminder: ${task.title}`,
          message,
          task.priority
        );
      }
    });
  }

  showNotification(title, message, priority = 'normal') {
    const iconUrl = priority === 'urgent' ? 'icons/icon48.png' : 'icons/icon48.png';
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: iconUrl,
      title: title,
      message: message,
      priority: priority === 'urgent' ? 2 : 1
    });
  }
}

// Initialize background task manager
new BackgroundTaskManager();
// Content script for Deadline Radar - detects deadlines and tasks on webpages

// Deadline detection patterns
const DEADLINE_PATTERNS = [
  // Common deadline phrases
  /(?:deadline|due(?:\s+date)?|submit(?:\s+by)?|expires?(?:\s+on)?|until|before|by)\s*:?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]+\s+\d{1,2}|\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)/gi,
  
  // Assignment/task patterns
  /(?:assignment|homework|project|essay|paper|report|submission|task)\s+(?:due|deadline|submit)\s*:?\s*([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}|[A-Za-z]+\s+\d{1,2}|\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)/gi,
  
  // Time-specific patterns
  /(?:by|before|until)\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)\s+on\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2})/gi
];

// Task keywords to look for context
const TASK_KEYWORDS = [
  'assignment', 'homework', 'project', 'essay', 'paper', 'report', 'submission',
  'task', 'quiz', 'exam', 'test', 'presentation', 'lab', 'workshop', 'meeting',
  'conference', 'interview', 'application', 'registration', 'payment', 'renewal'
];

class DeadlineDetector {
  constructor() {
    this.detectedTasks = [];
    this.init();
  }

  init() {
    // Run detection when page loads
    this.detectDeadlines();
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'getDetectedTasks') {
        sendResponse({ tasks: this.detectedTasks });
      } else if (request.action === 'redetect') {
        this.detectDeadlines();
        sendResponse({ tasks: this.detectedTasks });
      }
    });

    // Re-run detection on dynamic content changes
    const observer = new MutationObserver(() => {
      setTimeout(() => this.detectDeadlines(), 1000);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  detectDeadlines() {
    this.detectedTasks = [];
    const pageText = document.body.innerText;
    const pageUrl = window.location.href;
    const pageTitle = document.title;

    // Extract text content in chunks for better context
    const textChunks = this.getTextChunks();
    
    textChunks.forEach(chunk => {
      this.processTextChunk(chunk, pageUrl, pageTitle);
    });

    // Send detected tasks to background script
    if (this.detectedTasks.length > 0) {
      chrome.runtime.sendMessage({
        action: 'tasksDetected',
        tasks: this.detectedTasks,
        url: pageUrl,
        title: pageTitle
      });
    }

    console.log('Deadline Radar: Detected', this.detectedTasks.length, 'tasks');
  }

  getTextChunks() {
    const chunks = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          // Skip script and style elements
          if (node.parentElement.tagName === 'SCRIPT' || 
              node.parentElement.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      },
      false
    );

    let node;
    let currentChunk = '';
    let chunkSize = 0;
    const maxChunkSize = 500; // characters

    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      if (text.length > 0) {
        if (chunkSize + text.length > maxChunkSize && currentChunk) {
          chunks.push({
            text: currentChunk,
            element: node.parentElement
          });
          currentChunk = text;
          chunkSize = text.length;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + text;
          chunkSize += text.length;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push({
        text: currentChunk,
        element: document.body
      });
    }

    return chunks;
  }

  processTextChunk(chunk, pageUrl, pageTitle) {
    const text = chunk.text;
    
    DEADLINE_PATTERNS.forEach(pattern => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const dateStr = match[1] || match[2];
        
        if (dateStr) {
          const task = this.createTask(fullMatch, dateStr, text, pageUrl, pageTitle, chunk.element);
          if (task) {
            this.detectedTasks.push(task);
          }
        }
      }
    });
  }

  createTask(fullMatch, dateStr, context, pageUrl, pageTitle, element) {
    try {
      // Parse date using basic date parsing (we'll enhance this in background script with chrono-node)
      const parsedDate = this.parseDate(dateStr);
      if (!parsedDate || parsedDate < new Date()) {
        return null; // Skip past dates
      }

      // Extract task context
      const taskContext = this.extractTaskContext(fullMatch, context);
      
      const task = {
        id: this.generateTaskId(),
        title: taskContext.title,
        description: taskContext.description,
        deadline: parsedDate.toISOString(),
        dateString: dateStr,
        fullMatch: fullMatch,
        url: pageUrl,
        pageTitle: pageTitle,
        context: taskContext.context,
        element: this.getElementSelector(element),
        detected: new Date().toISOString(),
        status: 'pending',
        priority: this.calculatePriority(parsedDate),
        tags: taskContext.tags
      };

      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      return null;
    }
  }

  parseDate(dateStr) {
    // Basic date parsing - will be enhanced with chrono-node in background
    const cleanStr = dateStr.replace(/(\d+)(st|nd|rd|th)/g, '$1');
    
    // Try different date formats
    const formats = [
      // MM/DD/YYYY or MM/DD/YY
      /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
      // YYYY-MM-DD
      /(\d{4})-(\d{2})-(\d{2})/,
      // Month Day, Year
      /([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/,
      // Month Day (current year)
      /([A-Za-z]+)\s+(\d{1,2})/
    ];

    for (const format of formats) {
      const match = cleanStr.match(format);
      if (match) {
        try {
          const date = new Date(cleanStr);
          if (!isNaN(date.getTime())) {
            return date;
          }
        } catch (e) {
          continue;
        }
      }
    }

    return null;
  }

  extractTaskContext(fullMatch, context) {
    const contextWords = 50;
    const matchIndex = context.indexOf(fullMatch);
    const start = Math.max(0, matchIndex - contextWords * 5);
    const end = Math.min(context.length, matchIndex + fullMatch.length + contextWords * 5);
    const surroundingText = context.substring(start, end);

    // Extract title from surrounding text
    let title = 'Detected Task';
    const sentences = surroundingText.split(/[.!?]/);
    const matchingSentence = sentences.find(s => s.includes(fullMatch));
    
    if (matchingSentence) {
      // Look for task keywords
      const taskKeyword = TASK_KEYWORDS.find(keyword => 
        matchingSentence.toLowerCase().includes(keyword)
      );
      
      if (taskKeyword) {
        const words = matchingSentence.trim().split(/\s+/).slice(0, 8);
        title = words.join(' ').replace(/[^\w\s]/g, '').trim() || title;
      }
    }

    // Extract tags based on keywords
    const tags = TASK_KEYWORDS.filter(keyword =>
      surroundingText.toLowerCase().includes(keyword)
    );

    return {
      title: title,
      description: fullMatch,
      context: surroundingText.trim(),
      tags: tags
    };
  }

  calculatePriority(deadline) {
    const now = new Date();
    const timeDiff = deadline.getTime() - now.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    if (daysDiff < 1) return 'urgent';
    if (daysDiff < 3) return 'high';
    if (daysDiff < 7) return 'medium';
    return 'low';
  }

  generateTaskId() {
    return 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getElementSelector(element) {
    try {
      if (element.id) return `#${element.id}`;
      
      const tagName = element.tagName.toLowerCase();
      let selector = tagName;
      
      if (element.className) {
        const classes = element.className.split(' ').filter(c => c.trim());
        if (classes.length > 0) {
          selector += '.' + classes[0];
        }
      }
      
      return selector;
    } catch (error) {
      return 'body';
    }
  }
}

// Initialize the detector when the script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new DeadlineDetector());
} else {
  new DeadlineDetector();
}
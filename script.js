const expressionEl = document.querySelector('[data-expression]');
const resultEl = document.querySelector('[data-result]');
const historyList = document.getElementById('historyList');
const themeToggle = document.getElementById('themeToggle');
const installButton = document.getElementById('installButton');
const copyResultButton = document.getElementById('copyResult');
const clearHistoryButton = document.getElementById('clearHistory');
const loadingScreen = document.getElementById('loadingScreen');

let expression = '0';
let result = '0';
let memory = 0;
let history = [];
let deferredPrompt = null;
let isDark = true;

const buttons = Array.from(document.querySelectorAll('.btn, .pill-btn'));

function initialize() {
  document.body.classList.add('loaded');
  updateDisplay();
  renderHistory();
  attachEvents();
  restoreTheme();
  registerServiceWorker();
  manageInstallPrompt();
}

function attachEvents() {
  buttons.forEach((button) => {
    button.addEventListener('click', () => handleButton(button));
  });

  themeToggle.addEventListener('click', toggleTheme);
  copyResultButton.addEventListener('click', copyResult);
  clearHistoryButton.addEventListener('click', clearHistory);

  document.addEventListener('keydown', handleKeyboard);
}

function handleButton(button) {
  const action = button.dataset.action;
  const value = button.dataset.value;

  if (action === 'equals') {
    evaluateExpression();
    return;
  }

  if (action === 'clear') {
    clearDisplay();
    return;
  }

  if (action === 'backspace') {
    backspace();
    return;
  }

  if (action === 'memory') {
    handleMemory(value);
    return;
  }

  appendValue(value);
}

function appendValue(value) {
  if (expression === '0' || expression === 'Error') {
    expression = '';
  }

  if (value === 'random()') {
    expression += 'random()';
  } else if (value === '^2') {
    expression += '^2';
  } else if (value === '^3') {
    expression += '^3';
  } else if (value === 'sqrt(') {
    expression += 'sqrt('; 
  } else if (value === 'log(') {
    expression += 'log('; 
  } else if (value === 'ln(') {
    expression += 'ln('; 
  } else if (value === 'abs(') {
    expression += 'abs('; 
  } else if (value === 'exp(') {
    expression += 'exp('; 
  } else {
    expression += value;
  }

  updateDisplay();
}

function backspace() {
  if (expression === 'Error' || expression === '0') {
    expression = '0';
    result = '0';
    updateDisplay();
    return;
  }

  expression = expression.slice(0, -1) || '0';
  updateDisplay();
}

function clearDisplay() {
  expression = '0';
  result = '0';
  updateDisplay();
}

function evaluateExpression() {
  const displayScreen = document.querySelector('.display-screen');
  displayScreen.classList.add('transitioning');

  try {
    const inputExpression = expression;
    const computed = evaluate(inputExpression);
    result = formatNumber(computed);
    expression = result;
    addHistory(inputExpression, result);
  } catch (error) {
    result = 'Error';
    expression = 'Error';
  }

  updateDisplay();
  setTimeout(() => displayScreen.classList.remove('transitioning'), 180);
}

function addHistory(input, output) {
  history.unshift({ input, output });
  history = history.slice(0, 10);
  renderHistory();
}

function renderHistory() {
  if (!history.length) {
    historyList.innerHTML = '<li class="empty-state">Your calculations will appear here.</li>';
    return;
  }

  historyList.innerHTML = history
    .map(
      (item) => `
        <li class="history-item">
          <div class="expr">${escapeHtml(item.input)}</div>
          <div class="value">${escapeHtml(item.output)}</div>
        </li>
      `
    )
    .join('');
}

function clearHistory() {
  history = [];
  renderHistory();
}

function handleMemory(action) {
  if (action === 'MC') {
    memory = 0;
    result = 'Memory cleared';
  } else if (action === 'MR') {
    result = formatNumber(memory);
  } else if (action === 'M+') {
    memory += Number.parseFloat(result);
    result = 'Stored';
  } else if (action === 'M-') {
    memory -= Number.parseFloat(result);
    result = 'Stored';
  } else if (action === 'MS') {
    memory = Number.parseFloat(result);
    result = 'Stored';
  }

  expression = result;
  updateDisplay();
}

function updateDisplay() {
  expressionEl.textContent = expression;
  resultEl.textContent = result;
  resizeDisplay();
}

function resizeDisplay() {
  const value = expression.length > result.length ? expression : result;
  const maxSize = window.innerWidth < 600 ? 1.8 : 2.8;
  const size = Math.max(1.1, maxSize - value.length * 0.05);
  expressionEl.style.fontSize = `${size}rem`;
  resultEl.style.fontSize = `${Math.max(1.8, size + 0.8)}rem`;
}

function copyResult() {
  navigator.clipboard.writeText(result).then(() => {
    result = 'Copied';
    updateDisplay();
    setTimeout(() => {
      result = '0';
      updateDisplay();
    }, 900);
  });
}

function toggleTheme() {
  isDark = !isDark;
  document.body.classList.toggle('light-theme', !isDark);
  themeToggle.innerHTML = isDark ? '☀️' : '🌙';
  localStorage.setItem('nova-theme', isDark ? 'dark' : 'light');
}

function restoreTheme() {
  const saved = localStorage.getItem('nova-theme');
  if (saved === 'light') {
    isDark = false;
    document.body.classList.add('light-theme');
    themeToggle.innerHTML = '🌙';
  } else {
    themeToggle.innerHTML = '☀️';
  }
}

function handleKeyboard(event) {
  const key = event.key;
  const map = {
    '+': '+',
    '-': '-',
    '*': '*',
    '/': '/',
    '%': '%',
    '.': '.',
    '(': '(',
    ')': ')',
    '^': '^',
    '=': 'equals',
    Enter: 'equals',
    Backspace: 'backspace',
    Escape: 'clear',
  };

  if (/^[0-9]$/.test(key)) {
    appendValue(key);
    return;
  }

  if (map[key]) {
    if (map[key] === 'equals') {
      evaluateExpression();
    } else if (map[key] === 'backspace') {
      backspace();
    } else if (map[key] === 'clear') {
      clearDisplay();
    } else {
      appendValue(map[key]);
    }
    event.preventDefault();
  }
}

function manageInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.style.display = 'inline-flex';
  });

  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) {
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      installButton.style.display = 'none';
    }
    deferredPrompt = null;
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  }
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return 'Error';
  }
  const rounded = Math.round(value * 1e12) / 1e12;
  return rounded.toString();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function tokenize(input) {
  const tokens = [];
  let index = 0;

  while (index < input.length) {
    const char = input[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let number = '';
      let sawDot = false;
      while (index < input.length && (/[0-9.]/.test(input[index]) || input[index] === '.')) {
        if (input[index] === '.') {
          if (sawDot) break;
          sawDot = true;
        }
        number += input[index];
        index += 1;
      }
      tokens.push({ type: 'number', value: Number(number) });
      continue;
    }

    if (char === 'π' || char === 'e') {
      tokens.push({ type: 'constant', value: char });
      index += 1;
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let identifier = '';
      while (index < input.length && /[a-zA-Z]/.test(input[index])) {
        identifier += input[index];
        index += 1;
      }
      tokens.push({ type: 'identifier', value: identifier.toLowerCase() });
      continue;
    }

    if ('+-*/%^()!'.includes(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    throw new Error('Invalid token');
  }

  return tokens;
}

function evaluate(input) {
  const tokens = tokenize(input.replace(/×/g, '*').replace(/÷/g, '/'));
  let index = 0;

  function parseExpression() {
    return parseAddition();
  }

  function parseAddition() {
    let value = parseMultiplication();
    while (index < tokens.length && (tokens[index].value === '+' || tokens[index].value === '-')) {
      const operator = tokens[index++].value;
      const right = parseMultiplication();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  function parseMultiplication() {
    let value = parseUnary();
    while (index < tokens.length && (tokens[index].value === '*' || tokens[index].value === '/' || tokens[index].value === '%')) {
      const operator = tokens[index++].value;
      const right = parseUnary();
      if (operator === '*') value *= right;
      if (operator === '/') value /= right;
      if (operator === '%') value %= right;
    }
    return value;
  }

  function parseUnary() {
    if (index < tokens.length && (tokens[index].value === '+' || tokens[index].value === '-')) {
      const operator = tokens[index++].value;
      const value = parseUnary();
      return operator === '+' ? value : -value;
    }
    return parsePower();
  }

  function parsePower() {
    let value = parsePrimary();
    if (index < tokens.length && tokens[index].value === '^') {
      index += 1;
      const exponent = parseUnary();
      value = Math.pow(value, exponent);
    }
    if (index < tokens.length && tokens[index].value === '!') {
      index += 1;
      value = factorial(value);
    }
    return value;
  }

  function parsePrimary() {
    const token = tokens[index];
    if (!token) throw new Error('Unexpected end');

    if (token.type === 'number') {
      index += 1;
      return token.value;
    }

    if (token.type === 'constant') {
      index += 1;
      return token.value === 'π' ? Math.PI : Math.E;
    }

    if (token.type === 'identifier') {
      const identifier = token.value;
      index += 1;
      if (tokens[index] && tokens[index].value === '(') {
        index += 1;
        const argument = parseExpression();
        if (tokens[index] && tokens[index].value === ')') {
          index += 1;
        }
        return applyFunction(identifier, argument);
      }
      return applyFunction(identifier, 0);
    }

    if (token.value === '(') {
      index += 1;
      const value = parseExpression();
      if (tokens[index] && tokens[index].value === ')') {
        index += 1;
      }
      return value;
    }

    throw new Error('Invalid expression');
  }

  const result = parseExpression();
  if (index < tokens.length) {
    throw new Error('Unexpected token');
  }
  return result;
}

function applyFunction(name, value) {
  switch (name) {
    case 'sqrt':
      return Math.sqrt(value);
    case 'sin':
      return Math.sin(value);
    case 'cos':
      return Math.cos(value);
    case 'tan':
      return Math.tan(value);
    case 'asin':
      return Math.asin(value);
    case 'acos':
      return Math.acos(value);
    case 'atan':
      return Math.atan(value);
    case 'log':
      return Math.log10(value);
    case 'ln':
      return Math.log(value);
    case 'abs':
      return Math.abs(value);
    case 'exp':
      return Math.exp(value);
    case 'random':
      return Math.random();
    case 'fact':
      return factorial(value);
    default:
      throw new Error('Unsupported function');
  }
}

function factorial(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error('Factorial expects a non-negative integer');
  }
  let result = 1;
  for (let i = 2; i <= value; i += 1) {
    result *= i;
  }
  return result;
}

window.addEventListener('resize', resizeDisplay);
window.addEventListener('load', initialize);

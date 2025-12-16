import { cleanText } from './utils.js';

let quizData = [];
let currentQuestionIndex = 0;
let score = 0;
let selectedOption = null;
let timerId = null;
const TIME_LIMIT = 60; 

const scanPageBtn = document.getElementById('scanPage');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const quizContainer = document.getElementById('quizContainer');
const questionDiv = document.getElementById('question');
const optionsDiv = document.getElementById('options');
const submitAnswerBtn = document.getElementById('submitAnswer');
const nextQuestionBtn = document.getElementById('nextQuestion');
const timerDiv = document.getElementById('timer');
const questionNumberDiv = document.getElementById('questionNumber');
const resultDiv = document.getElementById('result');

async function generateMCQs(text) {
  try {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('API key not found. Please check your .env file.');
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Generate 10 multiple-choice questions based on the following text. Each question should have 4 options and one correct answer. Return the response in JSON format as an array of objects with fields: question (string), options (array of 4 strings), correctAnswer (string matching one of the options).\n\n${text}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1500
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const quizContent = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json\n|\n```/g, ''));
    if (!Array.isArray(quizContent) || quizContent.length < 10) {
      throw new Error('Invalid quiz format or insufficient questions.');
    }

    return quizContent;
  } catch (error) {
    throw new Error(`Failed to generate quiz: ${error.message}`);
  }
}

function startTimer() {
  let timeLeft = TIME_LIMIT;
  timerDiv.textContent = `Time: ${timeLeft}s`;
  timerId = setInterval(() => {
    timeLeft--;
    timerDiv.textContent = `Time: ${timeLeft}s`;
    if (timeLeft <= 0) {
      clearInterval(timerId);
      handleAnswerSubmission(false);
    }
  }, 1000);
}

function displayQuestion() {
  const question = quizData[currentQuestionIndex];
  questionNumberDiv.textContent = `Question ${currentQuestionIndex + 1}/10`;
  questionDiv.textContent = question.question;
  optionsDiv.innerHTML = '';
  question.options.forEach((option) => {
    const label = document.createElement('label');
    label.className = 'option';
    label.innerHTML = `
      <input type="radio" name="option" value="${option}" ${selectedOption === option ? 'checked' : ''}>
      ${option}
    `;
    optionsDiv.appendChild(label);
  });
  submitAnswerBtn.disabled = false;
  nextQuestionBtn.style.display = 'none';
  startTimer();
}

function handleAnswerSubmission(isCorrect) {
  clearInterval(timerId);
  if (isCorrect) score++;
  submitAnswerBtn.disabled = true;
  nextQuestionBtn.style.display = 'block';
  const correctAnswer = quizData[currentQuestionIndex].correctAnswer;
  optionsDiv.querySelectorAll('input').forEach(input => {
    input.disabled = true;
    if (input.value === correctAnswer) {
      input.parentElement.style.color = 'green';
    } else if (input.checked && input.value !== correctAnswer) {
      input.parentElement.style.color = 'red';
    }
  });
}

function showResult() {
  quizContainer.style.display = 'none';
  resultDiv.style.display = 'block';
  resultDiv.textContent = `Quiz Complete! Your score: ${score}/${quizData.length}`;
}

function resetQuiz() {
  quizData = [];
  currentQuestionIndex = 0;
  score = 0;
  selectedOption = null;
  clearInterval(timerId);
  quizContainer.style.display = 'none';
  resultDiv.style.display = 'none';
  errorDiv.style.display = 'none';
  loadingDiv.style.display = 'none';
  questionNumberDiv.textContent = '';
}

function showError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
  loadingDiv.style.display = 'none';
}

scanPageBtn.addEventListener('click', async () => {
  resetQuiz();
  loadingDiv.style.display = 'block';
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url.match(/geeksforgeeks\.org|w3schools\.com|github\.com/)) {
      throw new Error('This page is not supported. Try GeeksforGeeks, W3Schools, or a GitHub README.');
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        let text = '';
        if (window.location.hostname.includes('geeksforgeeks.org')) {
          const article = document.querySelector('.gfg_article, .article--viewer_content');
          text = article ? article.textContent : '';
        } else if (window.location.hostname.includes('w3schools.com')) {
          const content = document.querySelector('.w3-main, .tutorial-content');
          text = content ? content.textContent : '';
        } else if (window.location.hostname.includes('github.com')) {
           const readme = document.querySelector('article.markdown-body');
          text = readme ? readme.textContent : '';
        }
        return text;
      }
    });
    const text = results[0].result;
    if (!text || text.trim().length < 100) {
      throw new Error('Not enough content found on this page.');
    }
    const cleanedText = cleanText(text);
    quizData = await generateMCQs(cleanedText);
    loadingDiv.style.display = 'none';
    quizContainer.style.display = 'block';
    displayQuestion();
  } catch (error) {
    showError(error.message || 'Failed to scan page.');
  }
});

submitAnswerBtn.addEventListener('click', () => {
  const selected = optionsDiv.querySelector('input[name="option"]:checked');
  if (!selected) {
    showError('Please select an option.');
    return;
  }
  selectedOption = selected.value;
  const isCorrect = selectedOption === quizData[currentQuestionIndex].correctAnswer;
  handleAnswerSubmission(isCorrect);
});

// Move to next question
nextQuestionBtn.addEventListener('click', () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < quizData.length) {
    selectedOption = null;
    displayQuestion();
  } else {
    showResult();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const myLink = document.getElementById('myProjectLink'); 
  if (myLink) {
    myLink.addEventListener('click', (event) => {
      event.preventDefault(); 
      const url = myLink.href; 

      chrome.tabs.create({ url: url });
    });
  }
});
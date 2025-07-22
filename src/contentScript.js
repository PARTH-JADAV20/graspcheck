async function extractContent() {
  if (window.location.pathname.endsWith('.pdf')) {
    try {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      if (!pdfjsLib) {
        console.error('pdf.js not loaded');
        return '';
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
      const pdf = await pdfjsLib.getDocument(window.location.href).promise;
      let text = '';
      for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        text += textContent.items.map(item => item.str).join(' ') + ' ';
      }
      window.PDF_CONTENT = text;
      return text;
    } catch (error) {
      console.error('PDF extraction error:', error);
      return '';
    }
  }

  let text = '';
  if (window.location.hostname.includes('geeksforgeeks.org')) {
    const article = document.querySelector('.gfg_article, .article--viewer_content');
    text = article ? article.textContent : '';
  } else if (window.location.hostname.includes('w3schools.com')) {
    const content = document.querySelector('.w3-main, .tutorial-content');
    text = content ? content.textContent : '';
  } else if (window.location.hostname.includes('github.com')) {
    // Target .markdown-body for all .md files
    const markdown = document.querySelector('.markdown-body');
    if (markdown) {
      // Extract text from all relevant elements
      text = Array.from(markdown.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, code, pre, blockquote, table'))
        .map(element => element.textContent)
        .join(' ');
    }
  }
  return text;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractContent') {
    extractContent().then(text => sendResponse({ text }));
    return true;
  }
});
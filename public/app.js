document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramId = urlParams.get('telegramId');
  
    if (telegramId) {
      await authenticateUser(telegramId);
    } else {
      alert('Telegram ID is missing from the URL.');
    }
  });
  
  async function authenticateUser(telegramId) {
    try {
      const response = await fetch(`/api/authenticate/${telegramId}`);
      const data = await response.json();
  
      if (data.success) {
        loadTokens();
      } else {
        alert('Authentication failed. Please check your Telegram ID.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred. Please try again later.');
    }
  }
  
  async function loadTokens() {
    try {
      const response = await fetch('/api/tokens');
      const tokens = await response.json();
      const tokenList = document.getElementById('tokenList');
      tokenList.innerHTML = '';
  
      tokens.forEach(token => {
        const li = document.createElement('li');
        li.innerHTML = `
          <div class="token-info">
            <span>${token.name} (${token.symbol}) - ${token.boundingCurvePercentage.toFixed(2)}%</span>
            <button onclick="buyToken('${token.mint}')">Buy</button>
          </div>
        `;
        tokenList.appendChild(li);
      });
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred while loading tokens.');
    }
  }
  
  async function buyToken(mint) {
    const urlParams = new URLSearchParams(window.location.search);
    const telegramId = urlParams.get('telegramId');
  
    try {
      const response = await fetch('/api/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ telegramId, mint })
      });
      const data = await response.json();
  
      if (data.success) {
        alert('Token purchase successful!');
      } else {
        alert('Token purchase failed. Please try again.');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('An error occurred during the token purchase.');
    }
  }
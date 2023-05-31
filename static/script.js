function displayLoading(display) {
    var loading = document.getElementById('loading');
    loading.style.display = display ? 'block' : 'none';
    if (display) {
        document.getElementById('output').append(loading);
    }
}


var articlesByMessageIndex = {};

function displayOutput(output) {
    var message = document.createElement('div');
    message.className = 'message bot-message';
    message.setAttribute('data-index', document.getElementsByClassName('bot-message').length);
    message.onclick = handleBotMessageClick;

    var messageText = document.createElement('p');
    messageText.textContent = output;
    message.appendChild(messageText);

    var outputElement = document.getElementById('output');
    outputElement.append(message);
    outputElement.scrollTop = outputElement.scrollHeight;
}

function displayArticles(articles) {
    var messageIndex = document.getElementsByClassName('bot-message').length - 1;
    articlesByMessageIndex[messageIndex] = articles;
    actually_displayArticles(articles);
}

function actually_displayArticles(articles) {
    var container = document.getElementById('articles-container');
    container.innerHTML = ''; // Clear any existing articles
    for (var i = 0; i < articles.length; i++) {
        var article = articles[i];
        var title = article.title || 'Title Missing'; // Use fallback value if title is null or empty
        var cardHTML = `
            <a href="static/${article.path}" class="card mb-3" target="_blank">
                <div class="card-body">
                    <h5 class="card-title">${title}</h5>
                    <p class="card-text">${article.summary}</p>
                </div>
            </a>
        `;
        container.innerHTML += cardHTML;
    }
}



function handleBotMessageClick(event) {
    var messageElement = event.target.closest('.bot-message');
    var messageIndex = messageElement.getAttribute('data-index');
    var articles = articlesByMessageIndex[messageIndex];
    actually_displayArticles(articles);
}


function loadArticles() {
    fetch('/app/article-chat/api/articles')
        .then(response => response.json())
        .then(articles => displayArticlesInTable(articles))
        .catch(error => console.error('Error:', error));
}

function displayArticlesInTable(articles) {
    var tbody = document.getElementById('articles-table-body');
    tbody.innerHTML = '';  // Clear any existing articles
    for (var i = 0; i < articles.length; i++) {
        var article = articles[i];
        var row = `
            <tr>
                <th scope="row">${article.id}</th>
                <td>${article.title}</td>
                <td>${article.author}</td>
                <td>${article.summary}</td>
            </tr>
        `;
        tbody.innerHTML += row;
    }
}


function showChat() {
    document.getElementById('chat-view').style.display = 'block';
    document.getElementById('articles-view').style.display = 'none';
}

function showArticles() {
    document.getElementById('chat-view').style.display = 'none';
    document.getElementById('articles-view').style.display = 'block';
    loadArticles();
}






document.getElementById('text-input').addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        document.getElementById('text-form').dispatchEvent(new Event('submit'));
    }
});

document.getElementById('text-form').addEventListener('submit', function(event) {
    event.preventDefault();
    
    var text = document.getElementById('text-input').value;
    var message = document.createElement('div');
    message.className = 'message user-message';
    message.textContent = text;
    var outputElement = document.getElementById('output');
    outputElement.append(message);
    document.getElementById('text-input').value = '';
    var container = document.getElementById('articles-container');
    container.innerHTML = '';
    
    // Collect all messages
    var allMessages = '';
    var messages = outputElement.getElementsByClassName('message');
    for (var i = 0; i < messages.length; i++) {
        allMessages += messages[i].textContent + '\n';
    }

    // query_to_send = allMessages;
    query_to_send = text;

    displayLoading(true);
    fetch('/app/article-chat/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: query_to_send })  // Send all messages
    })
    .then(response => response.json())
    .then(data => {
        displayLoading(false);
        displayOutput(data.result);
        displayArticles(data.articles);
    });
});


document.addEventListener('DOMContentLoaded', function() {
    let textarea = document.getElementById('text-input');

    textarea.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
});

window.onload = function() {
    document.getElementById("text-input").focus();
};


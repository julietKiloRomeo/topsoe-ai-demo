function displayLoading(display) {
    var loading = document.getElementById('loading');
    loading.style.display = display ? 'block' : 'none';
    if (display) {
        document.getElementById('output').prepend(loading);
    }
}



function displayOutput(output) {
    var message = document.createElement('div');
    message.className = 'message bot-message';
    
    var messageText = document.createElement('p');
    messageText.textContent = output;
    message.appendChild(messageText);

    var outputElement = document.getElementById('output');
    outputElement.prepend(message);
    outputElement.scrollTop = outputElement.scrollHeight;
}





function displayArticles(articles) {
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
    outputElement.prepend(message);
    document.getElementById('text-input').value = '';
    var container = document.getElementById('articles-container');
    container.innerHTML = '';

    displayLoading(true);
    fetch('/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: text })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        displayLoading(false);
        displayOutput(data.result);
        displayArticles(data.articles);
    })
    .catch(e => console.log('There was an error: ' + e));
    
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


// // When the page is loaded...
// window.addEventListener('load', function() {
//     // Check if there's any state saved in local storage
//     var text = localStorage.getItem('query');
//     var result = localStorage.getItem('result');
//     var articles = JSON.parse(localStorage.getItem('articles'));
//     // If there is, restore the state of the page
//     if (text !== null) {
//         document.getElementById('text-input').value = text;
//     }
//     if (result !== null) {
//         document.getElementById('output').textContent = result;
//     }
//     if (articles !== null) {
//         displayArticles(articles);
//     }
// });
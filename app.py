from flask import Flask, request, jsonify, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_caching import Cache
import pathlib
from sqlalchemy import or_


from langchain.chains.qa_with_sources import load_qa_with_sources_chain
from langchain.llms import OpenAI
from knowledge_gpt.prompts import STUFF_PROMPT
from langchain.vectorstores.faiss import FAISS
from knowledge_gpt.embeddings import OpenAIEmbeddings

from dotenv import load_dotenv
import os

load_dotenv()  # take environment variables from .env.

from flask_cors import CORS


app = Flask(__name__, template_folder='.')
CORS(app)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///site.db'
cache = Cache(app,config={'CACHE_TYPE': 'simple'})
db = SQLAlchemy(app)


class Article(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    path = db.Column(db.String, unique=True, nullable=False)
    summary = db.Column(db.Text, nullable=False)
    author = db.Column(db.String)
    creator = db.Column(db.String)
    producer = db.Column(db.String)
    subject = db.Column(db.String)
    title = db.Column(db.String)

    def __repr__(self):
        return f"Article('{self.title}', '{self.path}')"

    @property
    def location(self):
        return pathlib.Path(self.path)


    def to_dict(self):
        return {
            'id': self.id,
            'path': self.path,
            'author': self.author,
            'summary': self.summary,
            'title': self.title,
        }



# $ flask shell
# >>> from app import db
# >>> db.create_all()
# >>> exit()

# db.drop_all()


#@cache.cached(timeout=3600) # cache for 50 seconds
def get_answer(docs, query):
    """Gets an answer to a question from a list of Documents."""
    # Get the answer
    if len(docs) == 0:
        return "I found no relevant articles for that question...\nSOURCES:"

    chain = load_qa_with_sources_chain(
        OpenAI(
            temperature=0, openai_api_key=os.getenv("OPENAI_API_KEY"),
        ),  # type: ignore
        chain_type="stuff",
        prompt=STUFF_PROMPT,
    )

    # Cohere doesn't work very well as of now.
    # chain = load_qa_with_sources_chain(
    #     Cohere(temperature=0), chain_type="stuff", prompt=STUFF_PROMPT  # type: ignore
    # )
    answer = chain(
        {"input_documents": docs, "question": query}, return_only_outputs=True
    )
    return answer["output_text"]

index_file = "faiss-file"
embeddings = OpenAIEmbeddings(
    openai_api_key=os.getenv("OPENAI_API_KEY"),
)  # type: ignore

index = FAISS.load_local(index_file, embeddings = embeddings)


@app.route('/')
def home():
    return render_template('index.html')

@app.route('/process', methods=['POST'])
def process_text():
    # Extract text from the POST request
    data = request.get_json(force=True)
    query = data.get('text', '')


    print(f"""###################\n{query}\n----------------""")
    docs = index.similarity_search_with_relevance_scores(query, k=8)

    LOWER_RELEVANCE_BOUND = 0.72
    docs = [doc for doc, relevance in docs if relevance > LOWER_RELEVANCE_BOUND]
    print(f"""docs..""")

    answer = get_answer(docs, query)
    print(f"""answer..""")
    answer_txt, sources_txt = answer.split("SOURCES")
    print(f"""{answer_txt}\n###################""")
    if len(docs) == 0:
        # Return a JSON response
        return jsonify(result=answer_txt, articles=[])

    # Query the database for articles...
    partial_paths = list({doc.metadata["file"] for doc in docs})
    matching_articles = Article.query.filter(or_(Article.path.like('%' + partial_path + '%') for partial_path in partial_paths)).all()
    # Convert the articles into dictionaries...
    article_dicts = [article.to_dict() for article in matching_articles]

    print(f"""{article_dicts}""")
    

    # Return a JSON response
    return jsonify(result=answer_txt, articles=article_dicts)



@app.route('/api/articles')
def api_articles():
    # Query the database for all articles
    articles = Article.query.all()

    # Convert each article to a dict
    articles = [article.to_dict() for article in articles]

    # Return the articles as JSON
    return jsonify(articles)
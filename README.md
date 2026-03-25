# WINDIFY

A Flask app that uploads an image, sends it to Groq, and returns a text analysis using `meta-llama/llama-4-scout-17b-16e-instruct`.

## Layout

- `app.py` runs the Flask server and Groq analysis endpoint.
- `templates/` holds the HTML pages.
- `styles/` holds the CSS files.
- `scripts/` holds the browser-side JavaScript.

## Setup

1. Put your Groq key in `.env` as `GROQ_API_KEY=...`.
2. Install dependencies with `pip install -r requirements.txt`.
3. Start the app with `python app.py`.
4. Open `http://127.0.0.1:5000/index.html` in your browser.

## Notes

- The Groq key field in the UI is optional if `GROQ_API_KEY` is already set on the server.
- The browser sends images to `/api/analyze`, and the Flask app calls Groq from there.
- The model used by default is `meta-llama/llama-4-scout-17b-16e-instruct`.

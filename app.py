from __future__ import annotations

import base64
import mimetypes
import os
from pathlib import Path

from flask import Flask, jsonify, redirect, render_template, request, send_from_directory, url_for
from groq import Groq


BASE_DIR = Path(__file__).resolve().parent
STYLES_DIR = BASE_DIR / "styles"
SCRIPTS_DIR = BASE_DIR / "scripts"
TEMPLATES_DIR = BASE_DIR / "templates"
DEFAULT_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
DEFAULT_PROMPT = (
    "Analyze this image and describe the visual design in plain English. "
    "Cover layout, colors, typography, spacing, components, and overall style. "
    "If it looks like a UI or website, explain what would be useful for recreating it with Tailwind CSS."
)


def load_env_file(env_path: Path = BASE_DIR / ".env") -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()

        if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
            value = value[1:-1]

        os.environ.setdefault(key, value)


load_env_file()

app = Flask(__name__, template_folder=str(TEMPLATES_DIR), static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024


def resolve_groq_api_key(override_key: str | None = None) -> str:
    api_key = (override_key or "").strip() or os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GROQ API key is not configured. Set GROQ_API_KEY in .env or send api_key with the request.")
    return api_key


def image_to_data_url(uploaded_file) -> str:
    mime_type = uploaded_file.mimetype or mimetypes.guess_type(uploaded_file.filename or "")[0] or "image/png"
    if not mime_type.startswith("image/"):
        raise ValueError("Unsupported image type. Please upload PNG, JPG, or WebP.")

    image_bytes = uploaded_file.read()
    if not image_bytes:
        raise ValueError("The uploaded image is empty.")

    encoded = base64.b64encode(image_bytes).decode("utf-8")
    return f"data:{mime_type};base64,{encoded}"


def analyze_with_groq(image_data_url: str, prompt: str, api_key: str) -> str:
    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model=DEFAULT_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_data_url}},
                ],
            }
        ],
        temperature=1,
        max_completion_tokens=1024,
        top_p=1,
        stream=True,
        stop=None,
    )

    chunks: list[str] = []
    for chunk in completion:
        choice = chunk.choices[0] if chunk.choices else None
        delta = getattr(getattr(choice, "delta", None), "content", None)
        if delta:
            chunks.append(delta)

    return "".join(chunks).strip()


@app.route("/")
def root() -> str:
    return redirect(url_for("index_page"))


@app.route("/index.html")
def index_page() -> str:
    return render_template("index.html")


@app.route("/home")
@app.route("/home.html")
def home_page() -> str:
    return render_template("home.html")


@app.route("/features")
@app.route("/features.html")
def features_page() -> str:
    return render_template("features.html")


@app.route("/docs")
@app.route("/docs.html")
def docs_page() -> str:
    return render_template("docs.html")


@app.route("/resources")
@app.route("/resources.html")
def resources_page() -> str:
    return render_template("resources.html")


@app.route("/styles/<path:filename>")
def serve_style(filename: str):
    return send_from_directory(STYLES_DIR, filename)


@app.route("/scripts/<path:filename>")
def serve_script(filename: str):
    return send_from_directory(SCRIPTS_DIR, filename)


@app.route("/gradient.png")
def serve_gradient():
    return send_from_directory(BASE_DIR, "gradient.png")


@app.post("/api/analyze")
def api_analyze():
    uploaded_image = request.files.get("image")
    if uploaded_image is None:
        return jsonify({"error": "No image was uploaded."}), 400

    try:
        prompt = request.form.get("prompt") or DEFAULT_PROMPT
        api_key = resolve_groq_api_key(request.form.get("api_key"))
        image_data_url = image_to_data_url(uploaded_image)
        description = analyze_with_groq(image_data_url, prompt, api_key)

        if not description:
            return jsonify({"error": "Groq returned an empty response."}), 502

        return jsonify({"description": description, "model": DEFAULT_MODEL})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        app.logger.exception("Groq analysis failed")
        return jsonify({"error": f"Groq analysis failed: {exc}"}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)

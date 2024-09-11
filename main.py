from flask import Flask, render_template
import logging

app = Flask(__name__)
logging.basicConfig(level=logging.DEBUG)

@app.route("/")
def index():
    app.logger.debug("Rendering index.html")
    return render_template("index.html")

if __name__ == "__main__":
    app.logger.info("Starting Flask application")
    app.run(host="0.0.0.0", port=5000, debug=True)

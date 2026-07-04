from backend.app import create_app
import os

app = create_app()

if __name__ == "__main__":
    # Run the Flask app on port 5102
    app.run(host="0.0.0.0", port=5102, debug=True)

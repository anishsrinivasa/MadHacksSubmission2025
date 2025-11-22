#!/usr/bin/env python3
"""
Fish Audio API Proxy Server
Solves CORS issues by proxying requests from frontend to Fish Audio API
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import io

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Fish Audio API Configuration
FISH_AUDIO_API_KEY = 'e216cf13d15d4dfa9072558b9c6c9a3e'
FISH_AUDIO_BASE_URL = 'https://api.fish.audio/v1'

@app.route('/tts', methods=['POST'])
def text_to_speech():
    """
    Proxy endpoint for Fish Audio TTS API
    Receives request from frontend, forwards to Fish Audio, returns audio
    """
    try:
        # Get request data from frontend
        data = request.get_json()

        print(f"=== Proxy TTS Request ===", flush=True)
        print(f"Text: {data.get('text', '')}", flush=True)
        print(f"Reference ID: {data.get('reference_id', '')}", flush=True)
        print(f"Prosody: {data.get('prosody', {})}", flush=True)
        print(f"Speed: {data.get('prosody', {}).get('speed', 1.0)}", flush=True)
        print(f"Volume: {data.get('prosody', {}).get('volume', 0)} dB", flush=True)
        print(f"Full Request Body: {data}", flush=True)

        # Forward request to Fish Audio API
        headers = {
            'Authorization': f'Bearer {FISH_AUDIO_API_KEY}',
            'Content-Type': 'application/json'
        }

        print(f"Sending to Fish Audio: {FISH_AUDIO_BASE_URL}/tts", flush=True)
        print(f"With data: {data}", flush=True)

        response = requests.post(
            f'{FISH_AUDIO_BASE_URL}/tts',
            headers=headers,
            json=data,
            timeout=30
        )

        print(f"Fish Audio Response Status: {response.status_code}", flush=True)
        print(f"Fish Audio Response Headers: {dict(response.headers)}", flush=True)

        if response.status_code != 200:
            error_text = response.text
            print(f"Fish Audio Error: {error_text}")
            return jsonify({
                'error': f'Fish Audio API error: {response.status_code}',
                'details': error_text
            }), response.status_code

        # Return audio file to frontend
        audio_data = response.content
        return send_file(
            io.BytesIO(audio_data),
            mimetype='audio/mpeg',
            as_attachment=False,
            download_name='speech.mp3'
        )

    except requests.exceptions.RequestException as e:
        print(f"Request Error: {str(e)}")
        return jsonify({'error': 'Failed to connect to Fish Audio API', 'details': str(e)}), 500
    except Exception as e:
        print(f"Server Error: {str(e)}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'service': 'Fish Audio Proxy'})

if __name__ == '__main__':
    print("=" * 60)
    print("Fish Audio Proxy Server Starting...")
    print("This server proxies Fish Audio API requests to avoid CORS")
    print("=" * 60)
    print(f"Proxy URL: http://localhost:5000/tts")
    print(f"Health Check: http://localhost:5000/health")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)

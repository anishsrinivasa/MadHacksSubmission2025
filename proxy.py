#!/usr/bin/env python3
"""
Fish Audio API Proxy Server
Solves CORS issues by proxying requests from frontend to Fish Audio API
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import requests
import io
import os
import json
import tempfile

# Try to import Fish Audio SDK, fallback to REST API if not available
try:
    from fishaudio import FishAudio
    SDK_AVAILABLE = True
except ImportError:
    SDK_AVAILABLE = False
    print("Fish Audio SDK not available, falling back to REST API", flush=True)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Fish Audio API Configuration
FISH_AUDIO_API_KEY = 'e216cf13d15d4dfa9072558b9c6c9a3e'
FISH_AUDIO_BASE_URL = 'https://api.fish.audio/v1'

# Initialize Fish Audio SDK client if available
if SDK_AVAILABLE:
    try:
        fish_audio_client = FishAudio(api_key=FISH_AUDIO_API_KEY)
        print("Fish Audio SDK initialized successfully", flush=True)
    except Exception as e:
        print(f"Failed to initialize Fish Audio SDK: {str(e)}", flush=True)
        SDK_AVAILABLE = False
        fish_audio_client = None
else:
    fish_audio_client = None

# Voice storage configuration
VOICE_STORAGE_FILE = "voice_storage.json"

def load_voice_storage():
    """Load voice IDs from storage file"""
    if os.path.exists(VOICE_STORAGE_FILE):
        try:
            with open(VOICE_STORAGE_FILE, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading voice storage: {e}")
            return {}
    return {}

def save_voice_storage(data):
    """Save voice IDs to storage file"""
    try:
        with open(VOICE_STORAGE_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving voice storage: {e}")
        return False

def get_user_voice_id(user_id="default"):
    """Get stored voice ID for a user"""
    storage = load_voice_storage()
    return storage.get(user_id)

def save_user_voice_id(user_id, voice_id):
    """Save voice ID for a user"""
    storage = load_voice_storage()
    storage[user_id] = voice_id
    save_voice_storage(storage)

def delete_user_voice_id(user_id):
    """Delete voice ID for a user"""
    storage = load_voice_storage()
    if user_id in storage:
        del storage[user_id]
        save_voice_storage(storage)
        return True
    return False

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
        print(f"User ID: {data.get('user_id', '')}", flush=True)
        print(f"Prosody: {data.get('prosody', {})}", flush=True)
        print(f"Speed: {data.get('prosody', {}).get('speed', 1.0)}", flush=True)
        print(f"Volume: {data.get('prosody', {}).get('volume', 0)} dB", flush=True)
        
        # Check if user has a cloned voice and use it if available
        user_id = data.get('user_id')
        if user_id:
            user_voice_id = get_user_voice_id(user_id)
            if user_voice_id:
                print(f"Using cloned voice for user {user_id}: {user_voice_id}", flush=True)
                data['reference_id'] = user_voice_id
        
        print(f"Full Request Body: {data}", flush=True)

        # Forward request to Fish Audio API
        headers = {
            'model': "s1",
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

@app.route('/search-voices', methods=['GET'])
def search_voices():
    """
    Endpoint to search for voices from Fish Audio API using Python SDK
    Supports query parameters: title (search query), tags (optional), language (optional)
    """
    try:
        # Get query parameters
        title = request.args.get('title', '')
        tags = request.args.get('tags', '')
        language = request.args.get('language', '')
        
        # Use Python SDK if available
        if SDK_AVAILABLE and fish_audio_client:
            try:
                print(f"Searching voices with SDK - title: '{title}', tags: '{tags}', language: '{language}'", flush=True)
                
                # Build search parameters
                search_params = {
                    'page_size': 20,
                    'sort_by': 'task_count'
                }
                
                if title:
                    search_params['title'] = title
                if tags:
                    search_params['tags'] = tags
                if language:
                    search_params['language'] = language
                
                # Call SDK method
                response = fish_audio_client.voices.list(**search_params)
                
                # Format response for frontend
                voices = []
                for voice in response.items:
                    voices.append({
                        'id': voice.id if hasattr(voice, 'id') else getattr(voice, '_id', ''),
                        'title': voice.title if hasattr(voice, 'title') else getattr(voice, 'name', 'Unnamed Voice'),
                        'tags': voice.tags if hasattr(voice, 'tags') else getattr(voice, 'tag', [])
                    })
                
                print(f"Found {len(voices)} voices", flush=True)
                
                return jsonify({
                    'items': voices,
                    'total': response.total if hasattr(response, 'total') else len(voices),
                    'page_size': 20
                })
                
            except Exception as sdk_error:
                print(f"SDK error: {str(sdk_error)}", flush=True)
                # Fall through to REST API fallback
        
        # Fallback to REST API if SDK not available or failed
        headers = {
            'Authorization': f'Bearer {FISH_AUDIO_API_KEY}',
            'Content-Type': 'application/json',
            'model': 's1'
        }
        
        # Build query parameters for REST API
        params = {}
        if title:
            params['q'] = title
        if tags:
            params['tags'] = tags
        if language:
            params['language'] = language
        params['limit'] = '20'
        
        # Try REST API endpoints
        endpoints_to_try = [
            '/v1/models',
            '/v1/voices',
            '/v1/voices/search',
            '/models',
            '/voices'
        ]
        
        for endpoint in endpoints_to_try:
            try:
                url = f'{FISH_AUDIO_BASE_URL}{endpoint}'
                print(f"Trying REST endpoint: {url} with params: {params}", flush=True)
                response = requests.get(url, headers=headers, params=params, timeout=15)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"Successfully fetched voices from {endpoint}", flush=True)
                    return jsonify(data)
                elif response.status_code == 404:
                    continue
                else:
                    print(f"Error from {endpoint}: {response.status_code} - {response.text}", flush=True)
            except Exception as e:
                print(f"Exception trying {endpoint}: {str(e)}", flush=True)
                continue
        
        # If all methods failed
        return jsonify({
            'error': 'Could not find voices endpoint',
            'message': 'Fish Audio voices API endpoint not found. Please check API documentation.',
            'items': [],
            'total': 0,
            'api_unavailable': True
        }), 200
        
    except Exception as e:
        print(f"Error in search_voices: {str(e)}", flush=True)
        return jsonify({'error': str(e), 'items': [], 'total': 0}), 500

@app.route('/list-voices', methods=['GET'])
def list_voices():
    """
    Endpoint to list available voices from Fish Audio API
    Try common endpoints to find voices
    """
    headers = {
        'Authorization': f'Bearer {FISH_AUDIO_API_KEY}',
        'Content-Type': 'application/json'
    }
    
    # Try common endpoints
    endpoints_to_try = [
        '/v1/voices',
        '/v1/references',
        '/v1/voices/list',
        '/v1/references/list',
        '/voices',
        '/references'
    ]
    
    results = {}
    for endpoint in endpoints_to_try:
        try:
            url = f'{FISH_AUDIO_BASE_URL}{endpoint}'
            print(f"Trying endpoint: {url}", flush=True)
            response = requests.get(url, headers=headers, timeout=10)
            results[endpoint] = {
                'status': response.status_code,
                'data': response.json() if response.status_code == 200 else response.text
            }
        except Exception as e:
            results[endpoint] = {'error': str(e)}
    
    return jsonify({
        'message': 'Attempted to fetch voices from multiple endpoints',
        'results': results
    })

# ========== VOICE CLONING ENDPOINTS ==========
@app.route('/api/create-voice', methods=['POST'])
def create_voice():
    """
    Create a voice model from a 30-second audio recording.
    Returns the voice_id (reference_id) for persistent use.
    """
    try:
        # Get user_id from form data
        user_id = request.form.get('user_id', 'default')
        
        # Get audio file from request
        if 'audio_file' not in request.files:
            return jsonify({'error': 'No audio file provided'}), 400
        
        audio_file = request.files['audio_file']
        
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        print(f"\n=== VOICE CLONING REQUEST ===")
        print(f"User ID: {user_id}")
        print(f"Audio file: {audio_file.filename}, Content-Type: {audio_file.content_type}")
        
        # Read audio file
        audio_bytes = audio_file.read()
        print(f"Audio file size: {len(audio_bytes)} bytes")
        
        # Validate file size
        if len(audio_bytes) > 10 * 1024 * 1024:  # 10MB max
            return jsonify({'error': 'Audio file too large (max 10MB)'}), 400
        if len(audio_bytes) < 1000:  # 1KB min
            return jsonify({'error': 'Audio file too small'}), 400
        
        # Use Fish Audio REST API to create voice model
        api_url = "https://api.fish.audio/model"
        
        headers = {
            "Authorization": f"Bearer {FISH_AUDIO_API_KEY}"
        }
        
        print(f"Calling Fish Audio API: {api_url}")
        
        # Create cover image (required for voice cloning)
        cover_image_available = False
        cover_image_buffers = {}
        
        try:
            from PIL import Image
            # Create a simple colored square image (200x200 pixels) as cover
            img = Image.new('RGB', (200, 200), color=(73, 109, 137))
            
            # Try different image formats and sizes
            for format_name, img_format in [('PNG', 'PNG'), ('JPEG', 'JPEG')]:
                img_buffer = io.BytesIO()
                img.save(img_buffer, format=img_format)
                img_buffer.seek(0)
                cover_image_buffers[format_name.lower()] = img_buffer
            
            cover_image_available = True
            print("Cover image created successfully (PNG and JPEG formats)")
        except ImportError:
            print("PIL/Pillow not available - install with: pip install Pillow")
            print("Will attempt without cover image first, then retry if needed")
        except Exception as e:
            print(f"Error creating cover image: {e}")
        
        # Save audio to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        try:
            # Prepare multipart form data
            # Include cover image in FIRST request to avoid the error
            with open(temp_file_path, 'rb') as f:
                # Correct form data fields as per Fish Audio API documentation
                files = {
                    'voices': (audio_file.filename or 'voice_recording.webm', f, audio_file.content_type or 'audio/webm')
                }
                
                # Add cover image with different possible field names
                if cover_image_available and 'png' in cover_image_buffers:
                    cover_image_buffers['png'].seek(0)
                    # Try 'cover' as the field name (most common)
                    files['cover'] = ('cover.png', cover_image_buffers['png'], 'image/png')
                    print("  Added cover image with field name 'cover'")
                
                data = {
                    'title': f"User {user_id}'s Voice",
                    'type': 'tts',  # Required: must be 'tts'
                    'train_mode': 'fast',  # Required: must be 'fast'
                    'is_public': '0',  # Try '0' for false (some APIs use 0/1)
                    'public': '0',  # Try '0' for false
                    'isPublic': 'false',  # Try camelCase with string
                    'private': 'true',  # Try private as string
                }
                
                print(f"Form data:")
                print(f"  title: {data['title']}")
                print(f"  type: {data['type']}")
                print(f"  train_mode: {data['train_mode']}")
                print(f"  is_public: {data['is_public']}")
                print(f"  public: {data['public']}")
                print(f"  private: {data['private']}")
                print(f"  voices: {audio_file.filename} ({len(audio_bytes)} bytes)")
                print(f"  cover: {'Included' if 'cover' in files else 'Not included'}")
                
                response = requests.post(api_url, headers=headers, files=files, data=data, timeout=120)
            
            # Clean up temp file
            try:
                os.unlink(temp_file_path)
            except:
                pass
            
            print(f"Response status: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            
            if response.status_code == 201:
                # Success - extract voice ID
                try:
                    result = response.json()
                    voice_id = result.get('_id') or result.get('id') or result.get('voice_id') or result.get('reference_id')
                    
                    if not voice_id:
                        return jsonify({
                            'error': 'Voice creation succeeded but no voice ID found in response',
                            'response': response.text[:500]
                        }), 500
                    
                    print(f"Voice model created successfully! Voice ID: {voice_id}")
                    
                    # Save voice ID to storage
                    save_user_voice_id(user_id, voice_id)
                    print(f"Voice ID saved for user: {user_id}")
                    
                    return jsonify({
                        "success": True,
                        "voice_id": voice_id,
                        "message": "Voice model created successfully",
                        "user_id": user_id
                    })
                except Exception as e:
                    return jsonify({
                        'error': f'Failed to parse response: {str(e)}',
                        'response': response.text[:500]
                    }), 500
            elif response.status_code == 400 and "cover image" in response.text.lower():
                # Special handling for cover image error - try with different field names
                print("Cover image required but not accepted. Trying different field names...")
                
                if not cover_image_available:
                    error_text = response.text[:1000]
                    return jsonify({
                        'error': f'Fish Audio API Error ({response.status_code})',
                        'details': f"{error_text}\n\nNote: Install Pillow (pip install Pillow) to enable automatic cover image generation."
                    }), response.status_code
                
                # Recreate temp file since we cleaned it up
                with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file_retry:
                    temp_file_retry.write(audio_bytes)
                    temp_file_path_retry = temp_file_retry.name
                
                # Try different field names for cover image
                cover_field_names = ['cover', 'cover_image', 'image', 'coverImage', 'thumbnail', 'thumb']
                success = False
                voice_id = None
                
                for field_name in cover_field_names:
                    try:
                        print(f"  Trying cover image with field name: '{field_name}'")
                        
                        # Reset image buffer
                        if 'png' in cover_image_buffers:
                            cover_image_buffers['png'].seek(0)
                        elif 'jpeg' in cover_image_buffers:
                            cover_image_buffers['jpeg'].seek(0)
                        else:
                            continue
                        
                        with open(temp_file_path_retry, 'rb') as f:
                            files_retry = {
                                'voices': (audio_file.filename or 'voice_recording.webm', f, audio_file.content_type or 'audio/webm'),
                            }
                            
                            # Add cover with current field name
                            if 'png' in cover_image_buffers:
                                files_retry[field_name] = ('cover.png', cover_image_buffers['png'], 'image/png')
                            else:
                                files_retry[field_name] = ('cover.jpg', cover_image_buffers['jpeg'], 'image/jpeg')
                            
                            data_retry = {
                                'title': f"User {user_id}'s Voice",
                                'type': 'tts',
                                'train_mode': 'fast',
                                'is_public': '0',
                                'public': '0',
                            }
                            
                            response_retry = requests.post(api_url, headers=headers, files=files_retry, data=data_retry, timeout=120)
                            
                            if response_retry.status_code == 201:
                                result = response_retry.json()
                                print(f"  Success with field name '{field_name}'! Response: {result}")
                                voice_id = result.get('_id') or result.get('id') or result.get('voice_id') or result.get('reference_id')
                                if voice_id:
                                    success = True
                                    # Save voice ID and return success
                                    save_user_voice_id(user_id, voice_id)
                                    print(f"Voice ID saved for user: {user_id}")
                                    
                                    # Clean up retry temp file
                                    try:
                                        os.unlink(temp_file_path_retry)
                                    except:
                                        pass
                                    
                                    return jsonify({
                                        "success": True,
                                        "voice_id": voice_id,
                                        "message": "Voice model created successfully",
                                        "user_id": user_id
                                    })
                            else:
                                error_text_retry = response_retry.text[:200]
                                print(f"  Failed with '{field_name}': {response_retry.status_code} - {error_text_retry}")
                                
                    except Exception as e:
                        print(f"  Exception with '{field_name}': {str(e)}")
                        continue
                
                # Clean up retry temp file
                try:
                    os.unlink(temp_file_path_retry)
                except:
                    pass
                
                # If we get here, all retries failed
                error_text = response.text[:1000]
                return jsonify({
                    'error': f'Fish Audio API Error ({response.status_code})',
                    'details': f"{error_text}\n\nTried cover image with field names: {', '.join(cover_field_names)}"
                }), response.status_code
            else:
                # Error response
                error_text = response.text[:1000]
                print(f"API Error: {response.status_code} - {error_text}")
                
                try:
                    error_json = response.json()
                    error_message = error_json.get('message') or error_json.get('error') or error_text
                except:
                    error_message = error_text
                
                return jsonify({
                    'error': f'Fish Audio API Error ({response.status_code})',
                    'details': error_message
                }), response.status_code
                
        except requests.exceptions.RequestException as e:
            # Clean up temp file on error
            try:
                os.unlink(temp_file_path)
            except:
                pass
            print(f"Request Error: {str(e)}")
            return jsonify({
                'error': 'Failed to connect to Fish Audio API',
                'details': str(e)
            }), 500
        except Exception as e:
            # Clean up temp file on error
            try:
                os.unlink(temp_file_path)
            except:
                pass
            print(f"Error: {str(e)}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'error': 'Failed to create voice model',
                'details': str(e)
            }), 500
            
    except Exception as e:
        print(f"Error creating voice: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/voice-status', methods=['GET'])
def get_voice_status():
    """Check if user has a cloned voice model"""
    try:
        user_id = request.args.get('user_id', 'default')
        voice_id = get_user_voice_id(user_id)
        
        if voice_id:
            return jsonify({
                "has_voice": True,
                "voice_id": voice_id,
                "status": "Personal Voice Activated"
            })
        else:
            return jsonify({
                "has_voice": False,
                "voice_id": None,
                "status": "Voice Model Not Setup"
            })
    except Exception as e:
        print(f"Error checking voice status: {e}")
        return jsonify({
            'error': 'Failed to check voice status',
            'details': str(e)
        }), 500

@app.route('/api/save-voice-id', methods=['POST'])
def save_voice_id():
    """
    Save a voice ID manually (for users who create voices in Fish Audio dashboard)
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'default')
        voice_id = data.get('voice_id', '').strip()
        
        if not voice_id:
            return jsonify({'error': 'Voice ID cannot be empty'}), 400
        
        save_user_voice_id(user_id, voice_id)
        print(f"Voice ID saved manually for user: {user_id}, voice_id: {voice_id}")
        
        return jsonify({
            "success": True,
            "message": "Voice ID saved successfully",
            "user_id": user_id,
            "voice_id": voice_id
        })
    except Exception as e:
        print(f"Error saving voice ID: {e}")
        return jsonify({
            'error': 'Failed to save voice ID',
            'details': str(e)
        }), 500

@app.route('/api/clear-voice', methods=['POST'])
def clear_voice():
    """
    Clear/delete the personal voice for a user
    """
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'default')
        
        deleted = delete_user_voice_id(user_id)
        
        if deleted:
            print(f"Voice ID cleared for user: {user_id}")
            return jsonify({
                "success": True,
                "message": "Personal voice cleared successfully",
                "user_id": user_id
            })
        else:
            return jsonify({
                "success": True,
                "message": "No personal voice found to clear",
                "user_id": user_id
            })
    except Exception as e:
        print(f"Error clearing voice ID: {e}")
        return jsonify({
            'error': 'Failed to clear voice ID',
            'details': str(e)
        }), 500

if __name__ == '__main__':
    print("=" * 60)
    print("Fish Audio Proxy Server Starting...")
    print("This server proxies Fish Audio API requests to avoid CORS")
    print("=" * 60)
    print(f"Proxy URL: http://localhost:5001/tts")
    print(f"Health Check: http://localhost:5001/health")
    print(f"Voice Cloning: http://localhost:5001/api/create-voice")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5001, debug=True)

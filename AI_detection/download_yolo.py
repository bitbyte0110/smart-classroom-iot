"""
Download YOLO model files for AI presence detection
"""

import requests
import os
from urllib.parse import urlparse

def download_file(url, filename):
    """Download file with progress indicator"""
    print(f"📥 Downloading {filename}...")
    
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        
        os.makedirs('yolo', exist_ok=True)
        filepath = os.path.join('yolo', filename)
        
        with open(filepath, 'wb') as f:
            if total_size == 0:
                f.write(response.content)
            else:
                downloaded = 0
                for chunk in response.iter_content(chunk_size=8192):
                    downloaded += len(chunk)
                    f.write(chunk)
                    percent = (downloaded / total_size) * 100
                    print(f"\r{'█' * int(percent/2):<50} {percent:.1f}%", end='')
        
        print(f"\n✅ Downloaded: {filepath} ({os.path.getsize(filepath)} bytes)")
        return True
        
    except Exception as e:
        print(f"❌ Error downloading {filename}: {e}")
        return False

def download_yolo_files():
    """Download YOLOv3-tiny model files"""
    print("🤖 Downloading YOLO model files...")
    print("=" * 50)
    
    files = [
        {
            'url': 'https://raw.githubusercontent.com/pjreddie/darknet/master/cfg/yolov3-tiny.cfg',
            'filename': 'yolov3-tiny.cfg'
        },
        {
            'url': 'https://pjreddie.com/media/files/yolov3-tiny.weights',
            'filename': 'yolov3-tiny.weights'
        }
    ]
    
    success = True
    for file_info in files:
        if not download_file(file_info['url'], file_info['filename']):
            success = False
    
    if success:
        print("\n🎉 All YOLO files downloaded successfully!")
        print("You can now run: python realtime_presence.py")
    else:
        print("\n❌ Some downloads failed. Please try again or download manually.")
    
    return success

if __name__ == "__main__":
    download_yolo_files()
    input("Press Enter to exit...")
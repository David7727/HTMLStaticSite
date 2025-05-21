import os
import shutil
from generate_page import generate_page  # Import the generate_page function

def clear_directory(directory):
    """Delete the destination directory if it exists."""
    try:
        if os.path.exists(directory):
            shutil.rmtree(directory)
            print(f"Deleted existing directory: {directory}")
    except Exception as e:
        print(f"Warning: Failed to clear destination directory '{directory}': {e}")

def copy_recursive(src, dst):
    """Recursively copy contents from src to dst, including all nested directories."""
    if not os.path.exists(dst):
        os.makedirs(dst)
        print(f"Created directory: {dst}")

    for item in os.listdir(src):
        src_path = os.path.join(src, item)
        dst_path = os.path.join(dst, item)

        if os.path.isfile(src_path):
            shutil.copy(src_path, dst_path)
            print(f"Copied file: {src_path} -> {dst_path}")
        elif os.path.isdir(src_path):
            copy_recursive(src_path, dst_path)

def main():
    # Clear the public directory
    destination_dir = "public"
    clear_directory(destination_dir)

    # Copy static files
    copy_recursive("static", "public")

    # Generate the main page
    generate_page("content/index.md", "static/template.html", "public/index.html")

if __name__ == "__main__":
    main()

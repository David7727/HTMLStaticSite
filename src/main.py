import os
import shutil
from generate_page import generate_page  # You already have this defined

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

def generate_pages_recursive(dir_path_content, template_path, dest_dir_path):
    """Recursively generate HTML pages from markdown files."""
    for root, _, files in os.walk(dir_path_content):
        for filename in files:
            if filename.endswith('.md'):
                md_path = os.path.join(root, filename)

                # Calculate the relative output path
                relative_path = os.path.relpath(md_path, dir_path_content)
                new_relative_path = os.path.splitext(relative_path)[0] + '.html'
                dest_path = os.path.join(dest_dir_path, new_relative_path)

                os.makedirs(os.path.dirname(dest_path), exist_ok=True)

                # Use the generate_page function instead of direct markdown conversion
                generate_page(md_path, template_path, dest_path)

def main():
    # Clear the public directory
    destination_dir = "public"
    clear_directory(destination_dir)

    # Copy static files
    copy_recursive("static", destination_dir)

    # Recursively generate HTML from all markdown files
    generate_pages_recursive("content", "static/template.html", destination_dir)

if __name__ == "__main__":
    main()

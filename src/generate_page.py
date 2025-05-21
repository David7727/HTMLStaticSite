import os
import re
from markdown2 import markdown
from extract_title import extract_title

def generate_page(from_path, template_path, dest_path):
    """Generate an HTML page from a markdown file using a template."""
    print(f"Generating page from {from_path} to {dest_path} using {template_path}")

    # Read the markdown content
    with open(from_path, 'r') as markdown_file:
        markdown_content = markdown_file.read()

    # Read the template
    with open(template_path, 'r') as template_file:
        template = template_file.read()

    # Convert markdown content to HTML
    html_content = markdown(markdown_content)

    # Post-process HTML to ensure correct tags are used
    html_content = html_content.replace('<strong>', '<b>').replace('</strong>', '</b>')
    html_content = html_content.replace('<em>', '<i>').replace('</em>', '</i>')

    # Modify the blockquote to remove <p> tags inside it
    # This regex checks if the blockquote only contains a single <p> and removes the <p> tag
    html_content = re.sub(r'<blockquote>\s*<p>(.*?)</p>\s*</blockquote>', r'<blockquote>\1</blockquote>', html_content)

    # Extra handling to remove nested <p> tags inside blockquotes (even for multi-line blockquotes)
    html_content = re.sub(r'<blockquote>\s*<p>', '<blockquote>', html_content)
    html_content = re.sub(r'</p>\s*</blockquote>', '</blockquote>', html_content)

    # Extract the title from the markdown file
    title = extract_title(markdown_content)

    # Replace the placeholders in the template with the actual content
    full_html = template.replace('{{ Title }}', title).replace('{{ Content }}', html_content)

    # Create the destination directory if it doesn't exist
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)

    # Write the full HTML content to the destination file
    with open(dest_path, 'w') as output_file:
        output_file.write(full_html)

    print(f"Page generated successfully: {dest_path}")

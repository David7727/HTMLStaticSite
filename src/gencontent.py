import os
from markdown_blocks import markdown_to_html_node

def extract_title(md):
    lines = md.split("\n")
    for line in lines:
        if line.startswith("# "):
            return line[2:]
    raise ValueError("No title found in markdown")

def generate_page(input_path, template_path, output_path, basepath="/"):
    with open(input_path, 'r') as f:
        markdown = f.read()

    title = extract_title(markdown)
    html_content = markdown_to_html_node(markdown).to_html()

    with open(template_path, 'r') as f:
        template = f.read()

    html = template.replace("{{ Title }}", title)
    html = html.replace("{{ Content }}", html_content)

    # Normalize basepath
    # Normalize basepath
    if not basepath.endswith("/"):
        basepath += "/"

    # Fix URLs for GitHub Pages
    html = html.replace('href="HTMLStaticSite', f'href="{basepath}')
    html = html.replace('src="HTMLStaticSite', f'src="{basepath}')
    html = html.replace('href="/', f'href="{basepath}')
    html = html.replace('src="/', f'src="{basepath}')



    with open(output_path, 'w') as f:
        f.write(html)

def generate_pages_recursive(content_dir, template_path, output_dir, basepath="/"):
    for root, _, files in os.walk(content_dir):
        for file in files:
            if file.endswith(".md"):
                rel_dir = os.path.relpath(root, content_dir)
                input_path = os.path.join(root, file)
                output_subdir = os.path.join(output_dir, rel_dir)
                os.makedirs(output_subdir, exist_ok=True)

                output_filename = file.replace(".md", ".html")
                output_path = os.path.join(output_subdir, output_filename)

                generate_page(input_path, template_path, output_path, basepath)

import re

def extract_title(markdown: str) -> str:
    """Extracts the first H1 (#) title from a markdown string."""
    for line in markdown.splitlines():
        line = line.strip()
        match = re.match(r'^#(?!#)( +[^\s].*)$', line)
        if match:
            return match.group(1).strip()
    raise Exception("Markdown is missing a valid H1 title.")

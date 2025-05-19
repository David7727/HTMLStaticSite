import unittest
import re
from enum import Enum

# --- ENUM + CLASS ---

class TextType(Enum):
    TEXT = "text"
    BOLD = "bold"
    ITALIC = "italic"
    CODE = "code"
    LINK = "link"
    IMAGE = "image"

class TextNode:
    def __init__(self, text, text_type, url=None, alt=None):
        self.text = text
        self.text_type = text_type
        self.url = url
        self.alt = alt

    def __eq__(self, other):
        return (
            isinstance(other, TextNode)
            and self.text == other.text
            and self.text_type == other.text_type
            and self.url == other.url
            and self.alt == other.alt
        )

    def __repr__(self):
        return f'TextNode("{self.text}", TextType.{self.text_type.name}' + (
            f', "{self.url}"' if self.url else ''
        ) + ")"

# --- UTILITY SPLITTER ---

def split_nodes_delimiter(old_nodes, delimiter, text_type):
    escaped_delimiter = re.escape(delimiter)
    pattern = re.compile(f'{escaped_delimiter}(.*?){escaped_delimiter}')
    new_nodes = []

    for old_node in old_nodes:
        if old_node.text_type != TextType.TEXT:
            new_nodes.append(old_node)
            continue

        text = old_node.text
        current_index = 0

        for match in pattern.finditer(text):
            start, end = match.span()
            # Add plain text before the matched delimiter pair
            if start > current_index:
                new_nodes.append(TextNode(text[current_index:start], TextType.TEXT))

            # Add the formatted text inside the delimiters
            matched_text = match.group(1)
            new_nodes.append(TextNode(matched_text, text_type))

            current_index = end

        # Add remaining text after the last match
        if current_index < len(text):
            new_nodes.append(TextNode(text[current_index:], TextType.TEXT))

    return new_nodes

# --- SPLITTERS ---

def split_nodes_image(old_nodes):
    image_pattern = re.compile(r'!\[([^\]]+)\]\((https?://[^\)]+)\)')
    new_nodes = []

    for node in old_nodes:
        if node.text_type != TextType.TEXT:
            new_nodes.append(node)
            continue
        text = node.text
        while True:
            match = image_pattern.search(text)
            if not match:
                if text:
                    new_nodes.append(TextNode(text, TextType.TEXT))
                break
            before = text[:match.start()]
            if before:
                new_nodes.append(TextNode(before, TextType.TEXT))
            alt_text = match.group(1).strip()
            url = match.group(2).strip()
            new_nodes.append(TextNode(alt_text, TextType.IMAGE, url, alt_text))
            text = text[match.end():]
    return new_nodes

def split_nodes_link(old_nodes):
    link_pattern = re.compile(r'\[([^\]]+)\]\((https?://[^\)]+)\)')
    new_nodes = []

    for node in old_nodes:
        if node.text_type != TextType.TEXT:
            new_nodes.append(node)
            continue
        text = node.text
        while True:
            match = link_pattern.search(text)
            if not match:
                if text:
                    new_nodes.append(TextNode(text, TextType.TEXT))
                break
            before = text[:match.start()]
            if before:
                new_nodes.append(TextNode(before, TextType.TEXT))
            link_text = match.group(1).strip()
            url = match.group(2).strip()
            new_nodes.append(TextNode(link_text, TextType.LINK, url))
            text = text[match.end():]
    return new_nodes

# --- EXTRACTION (used in some of your tests) ---

def extract_markdown_images(text):
    return re.findall(r'!\[([^\]]+)\]\((https?://[^\)]+)\)', text)

def extract_markdown_links(text):
    return re.findall(r'\[([^\]]+)\]\((https?://[^\)]+)\)', text)

def text_to_textnodes(text):
    nodes = [TextNode(text, TextType.TEXT)]

    # Process images first — they can look like links with a leading "!"
    nodes = split_nodes_image(nodes)

    # Then links
    nodes = split_nodes_link(nodes)

    # Then code (protects content from formatting)
    nodes = split_nodes_delimiter(nodes, "`", TextType.CODE)

    # Then bold, then italic
    nodes = split_nodes_delimiter(nodes, "**", TextType.BOLD)
    nodes = split_nodes_delimiter(nodes, "_", TextType.ITALIC)

    return nodes

# --- markdown_to_blocks FUNCTION ---

def markdown_to_blocks(markdown):
    # Normalize newlines to Unix style
    markdown = markdown.replace("\r\n", "\n")

    # Split the markdown by two or more newlines (including blank lines with spaces or tabs)
    blocks = re.split(r'\n\s*\n', markdown)

    # Strip each block of leading/trailing whitespace and filter out empty blocks
    blocks = [block.strip() for block in blocks if block.strip()]

    return blocks

# --- TEST CASES ---

class TestMarkdownFunctions(unittest.TestCase):

    def test_markdown_to_blocks(self):
        md = """
This is **bolded** paragraph

This is another paragraph with _italic_ text and `code` here
This is the same paragraph on a new line

- This is a list
- with items


"""
        blocks = markdown_to_blocks(md)
        self.assertEqual(
            blocks,
            [
                "This is **bolded** paragraph",
                "This is another paragraph with _italic_ text and `code` here\nThis is the same paragraph on a new line",
                "- This is a list\n- with items",
            ],
        )

    def test_multiple_blank_lines_between_blocks(self):
        md = "Block 1\n\n\n\nBlock 2"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Block 1", "Block 2"])

    def test_leading_trailing_blank_lines(self):
        md = "\n\nBlock 1\n\nBlock 2\n\n"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Block 1", "Block 2"])

    def test_empty_string(self):
        md = "\n\n"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, [])

    def test_single_block(self):
        md = "Single block"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Single block"])

    def test_single_blank_line_in_paragraph(self):
        md = "This is a paragraph\nthat has a blank line\nwithin it."
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["This is a paragraph\nthat has a blank line\nwithin it."])

    def test_windows_line_endings(self):
        md = "Block 1\r\n\r\nBlock 2"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Block 1", "Block 2"])

    # Edge Case: Leading and trailing blank lines with spaces/tabs
    def test_leading_trailing_blank_lines_with_spaces_tabs(self):
        md = "\n\n\t  \n  \nText"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Text"])

    # Edge Case: Block consisting of only whitespace (spaces/tabs)
    def test_whitespace_only_block(self):
        md = "   \n\n  \t  \n\nText"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Text"])

    # Edge Case: Input with only whitespace between blocks
    def test_whitespace_between_blocks(self):
        md = "Text\n\n   \t\n\nMore text"
        blocks = markdown_to_blocks(md)
        self.assertEqual(blocks, ["Text", "More text"])

# Run the test
if __name__ == "__main__":
    unittest.main()
